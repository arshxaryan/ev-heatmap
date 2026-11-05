/**
 * Deterministic seed generator.
 *
 * Produces *realistic mock* Vahan-style monthly EV registrations per district
 * and vehicle category, plus public charging stations, so the app renders a
 * believable India-wide heat map on first run with zero external calls.
 *
 * Determinism: a tiny seeded PRNG (mulberry32) guarantees the same data every
 * run — useful for tests, screenshots and demos.
 *
 * Realism model:
 *  - State-level monthly EV volume ∝ `penetration` factor (india-geo.js).
 *  - Growth: ~22% YoY national trend + sinusoidal seasonality (festive spikes
 *    in Oct–Nov like real Vahan data) + per-district noise.
 *  - Category mix: 2W dominates nationally (~60%), 3W high in UP/Bihar,
 *    4W skews to metros, buses rare and concentrated in big cities.
 *  - Chargers: county count ∝ cumulative EV stock × `coverage`, so
 *    e.g. Bihar ends up with a severe gap and Delhi/Goa well served.
 */
const { db, setMeta } = require('./index');
const geo = require('../../../data/geo/india-geo');
const config = require('../config');

const CATEGORY_WEIGHTS = {
  default: { '2W': 0.6, '3W': 0.17, '4W': 0.18, BUS: 0.05 },
  BR: { '2W': 0.42, '3W': 0.42, '4W': 0.13, BUS: 0.03 },  // e-rickshaw heartland
  UP: { '2W': 0.5, '3W': 0.32, '4W': 0.15, BUS: 0.03 },
  DL: { '2W': 0.38, '3W': 0.3, '4W': 0.28, BUS: 0.04 },
  KL: { '2W': 0.72, '3W': 0.08, '4W': 0.17, BUS: 0.03 },
};

const OPERATORS = [
  ['Tata Power EZ Charge', 0.26], ['Statiq', 0.18], ['ChargeZone', 0.13],
  ['Ather Grid', 0.11], ['Zeon Charging', 0.08], ['ElectricPe', 0.07],
  ['Shell Recharge', 0.05], ['Relux (Glida)', 0.05], ['Jio-bp Pulse', 0.07],
];
const AC_CONNECTORS = ['Type 2 (AC)', 'Bharat AC-001', 'Type 2 + Type 1'];
const DC_CONNECTORS = ['CCS2', 'CHAdeMO', 'Bharat DC-001', 'CCS2 + CHAdeMO'];
const AC_KW = [3.3, 7.4, 11, 22];
const DC_KW = [30, 50, 60, 100, 150, 240];

/** mulberry32 — deterministic PRNG. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** "YYYY-MM" helpers */
function* monthsBetween(first, last) {
  const [y, m] = first.split('-').map(Number);
  const [y2, m2] = last.split('-').map(Number);
  let d = y * 12 + m - 1;
  const end = y2 * 12 + m2 - 1;
  while (d <= end) { yield `${Math.floor(d / 12)}-${String((d % 12) + 1).padStart(2, '0')}`; d++; }
}

function monthIndex(list, month) { return list.indexOf(month); }

function pickWeighted(rand, weighted) {
  const r = rand();
  let acc = 0;
  for (const [item, w] of weighted) { acc += w; if (r <= acc) return item; }
  return weighted[weighted.length - 1][0];
}

/** Seed or reset all tables with generated sample data. */
function seedDatabase() {
  const rand = rng(20261105);
  const { firstMonth, baseNationalMonthly } = config.seed;
  const lastMonth = `${config.seed.lastMonthYear}-${String(config.seed.lastMonthIndex).padStart(2, '0')}`;
  const months = Array.from(monthsBetween(firstMonth, lastMonth));

  const w = db.transaction(() => {
    db.exec('DELETE FROM chargers; DELETE FROM registrations; DELETE FROM districts; DELETE FROM regions;');

    const insRegion = db.prepare('INSERT INTO regions (code, name, type, lat, lon) VALUES (?,?,?,?,?)');
    const insDistrict = db.prepare('INSERT INTO districts (state_code, name, lat, lon) VALUES (?,?,?,?)');
    const insReg = db.prepare('INSERT OR IGNORE INTO registrations (state_code, district_id, month, category, count) VALUES (?,?,?,?,?)');
    const insCharger = db.prepare('INSERT INTO chargers (state_code, district_id, name, operator, kind, kw, connector, lat, lon, source) VALUES (?,?,?,?,?,?,?,?,?,?)');

    // Total penetration weight across states, for distributing national volume.
    const penSum = geo.reduce((s, r) => s + r.penetration, 0);

    for (const region of geo) {
      insRegion.run(region.code, region.name, region.type, region.lat, region.lon);

      // District volume shares: deterministic jitter, top district (usually the metro) is large.
      const shares = region.districts.map(([name], i) => {
        const jitter = 0.55 + rand() * 0.9;                      // 0.55 – 1.45
        const rankBias = (region.districts.length - i) / region.districts.length;
        return 0.35 + 0.65 * rankBias * jitter;                  // roughly descending
      });
      const shareSum = shares.reduce((a, b) => a + b, 0);

      region.districts.forEach(([dName, dLat, dLon], i) => {
        const info = insDistrict.run(region.code, dName, dLat, dLon);
        const districtId = info.lastInsertRowid;
        const distShare = shares[i] / shareSum;

        // State's monthly EV count = national base × penetration weight.
        const stateMonthly = (baseNationalMonthly * region.penetration) / penSum;
        const catWeights = CATEGORY_WEIGHTS[region.code] || CATEGORY_WEIGHTS.default;
        const cumRegistered = { '2W': 0, '3W': 0, '4W': 0, BUS: 0 };

        months.forEach((month, mi) => {
          const t = mi / (months.length - 1);
          // 22% YoY growth + festive-season bump (Sep–Nov) + local noise.
          const growth = Math.pow(1 + 0.22 + region.penetration * 0.015, t * (months.length / 12));
          const season = 1 + 0.18 * Math.max(0, Math.sin(((mi % 12) / 12) * 2 * Math.PI - 1.0));
          const noise = 0.85 + rand() * 0.3;
          const monthTotal = stateMonthly * distShare * growth * season * noise;
          // District monthly total.
          const forDistrict = monthTotal;

          for (const cat of ['2W', '3W', '4W', 'BUS']) {
            let count = Math.round(forDistrict * catWeights[cat]);
            if (cat === 'BUS') count = Math.max(0, Math.round(count * (0.5 + rand())));
            count = Math.round(count / 10) * 10; // round to 10s — Vahan-style bucketing
            if (count > 0) {
              insReg.run(region.code, districtId, month, cat, count);
              cumRegistered[cat] += count;
            }
          }
        });

        // Charger count ∝ cumulative stock × coverage (gap driver for the demo).
        const cumTotal = Object.values(cumRegistered).reduce((a, b) => a + b, 0);
        const nChargers = Math.max(1, Math.round((cumTotal * region.coverage * (0.7 + rand() * 0.6)) / 110));
        const opWeighted = OPERATORS;
        for (let k = 0; k < nChargers; k++) {
          const kind = rand() < 0.62 ? 'AC' : 'DC';
          const kw = kind === 'AC' ? AC_KW[Math.floor(rand() * AC_KW.length)] : DC_KW[Math.floor(rand() * DC_KW.length)];
          const operator = pickWeighted(rand, opWeighted);
          const connector = (kind === 'AC' ? AC_CONNECTORS : DC_CONNECTORS)[Math.floor(rand() * 2)];
          // Cluster around district centre: 70% within ~0.08°, rest spread out ~0.35°.
          const spread = rand() < 0.7 ? 0.08 : 0.35;
          const lat = dLat + (rand() - 0.5) * spread;
          const lon = dLon + (rand() - 0.5) * spread;
          insCharger.run(region.code, districtId, `${dName} — ${operator} #${k + 1}`, operator, kind, kw, connector, lat, lon, 'sample');
        }
      });
    }

    setMeta('last_updated', new Date().toISOString());
    setMeta('source_mode', 'sample');
    setMeta('data_window_first', firstMonth);
    setMeta('data_window_last', lastMonth);
    setMeta('seed_version', '1');
  });

  w();

  const counts = {
    registrations: db.prepare('SELECT COUNT(*) c FROM registrations').get().c,
    chargers: db.prepare('SELECT COUNT(*) c FROM chargers').get().c,
    districts: db.prepare('SELECT COUNT(*) c FROM districts').get().c,
    states: db.prepare('SELECT COUNT(*) c FROM regions').get().c,
    months: months.length,
  };
  console.log('[seed] done:', counts);
  return counts;
}

module.exports = { seedDatabase, rng, hashStr, monthsBetween };

if (require.main === module) seedDatabase();
