/**
 * CSV ingestion with two supported schemas (auto-detected by header):
 *
 *  A) Canonical monthly aggregate (recommended for upload / scheduled export):
 *       state_code, state_name, district, month, category, count
 *       e.g.  MH,Pune,MH,Pune,2025-08,2W,4100
 *
 *  B) Per-vehicle dataset (the bundled sample `data/sample/India_EV_Dataset.csv`):
 *       County, City, State, Postal Code, Model Year, Make, Model,
 *       Electric Vehicle Type, ...   — one row per vehicle.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { db, setMeta } = require('../db');

const VALID_CATEGORIES = new Set(['2W', '3W', '4W', 'BUS']);

/** Canonicalize a category token: "3 Wheeler"/"Auto"→3W etc. */
function canonCategory(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (/^(BUS|E-?BUS)/.test(s)) return 'BUS';
  if (/^(2W|TWO|2-?WHEELER|SCOOTER|BIKE|MOPED)/.test(s)) return '2W';
  if (/^(3W|THREE|3-?WHEELER|AUTO|E-?RICK)/.test(s)) return '3W';
  if (/^(4W|FOUR|4-?WHEELER|CAR|SUV)/.test(s)) return '4W';
  return null;
}

/** Fuzzy-resolve a City name against a state's districts. */
function resolveDistrict(stateCode, cityName) {
  const rows = db.prepare('SELECT id, name FROM districts WHERE state_code = ?').all(stateCode);
  if (!cityName || !rows.length) return rows[0] || null;
  const key = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');
  const c = key(cityName);
  // 1) exact match, 2) name before "(" matches, 3) substring match, 4) alias table.
  let hit = rows.find((r) => key(r.name) === c);
  if (!hit) hit = rows.find((r) => key(r.name.split('(')[0]) === c);
  if (!hit) hit = rows.find((r) => key(r.name.split('(')[0]).includes(c) || c.includes(key(r.name.split('(')[0])));
  if (!hit) {
    const alias = {
      kanpur: 'Kanpur Nagar', kochi: 'Kochi (Ernakulam)', noida: 'Gautam Buddha Nagar (Noida)',
      mumbai: 'Mumbai City', newdelhi: 'New Delhi', vijayawada: 'Guntur', calicut: 'Kozhikode',
      trivandrum: 'Thiruvananthapuram', calutta: 'Kolkata', bombay: 'Mumbai City',
    };
    if (alias[c]) hit = rows.find((r) => key(r.name) === key(alias[c]));
  }
  return hit || rows[0]; // fall back to the state's largest seeded district
}

function resolveState(stateName) {
  const s = String(stateName || '').trim();
  const row = db.prepare('SELECT code FROM regions WHERE LOWER(name) = LOWER(?) OR UPPER(code) = UPPER(?)').get(s, s);
  if (row) return row.code;
  const legacy = { orissa: 'OD', pondicherry: 'PY', uttaranchal: 'UK', delhi: 'DL', nctofdelhi: 'DL', 'delhinct': 'DL', 'jammukashmir': 'JK' };
  return legacy[s.toLowerCase().replace(/[^a-z]/g, '')] || null;
}

function parseCsv(input) {
  return new Promise((resolve, reject) => {
    parse(input, { columns: true, skip_empty_lines: true, trim: true }, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

/**
 * Ingest CSV text (string or Buffer). Returns { schema, loaded, skipped, months }.
 * Uses INSERT ... ON CONFLICT UPDATE (+ = sum for per-vehicle schema).
 */
async function ingestCsv(input) {
  const rows = await parseCsv(input);
  if (!rows.length) throw new Error('CSV has no data rows');

  const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  const perVehicle = headers.includes('city') && headers.includes('modelyear');
  const stats = { schema: perVehicle ? 'per-vehicle' : 'canonical', loaded: 0, skipped: 0, months: new Set() };

  const run = db.transaction(() => {
    const upsum = db.prepare(`INSERT INTO registrations (state_code, district_id, month, category, count)
      VALUES (?,?,?,?,?) ON CONFLICT(state_code, district_id, month, category)
      DO UPDATE SET count = count + excluded.count`);
    const upset = db.prepare(`INSERT INTO registrations (state_code, district_id, month, category, count)
      VALUES (?,?,?,?,?) ON CONFLICT(state_code, district_id, month, category)
      DO UPDATE SET count = excluded.count`);

    const cache = new Map();
    for (const r of rows) {
      stats.skipped++;
      const stateCode = resolveState(r.State || r.state_code || r.state_name || r['State']);
      if (!stateCode) continue;
      const month = perVehicle
        ? `${parseInt(r['Model Year'], 10) || 0}-01`
        : String(r.month || '').trim();
      if (!/^\d{4}-\d{2}$/.test(month) || +month.slice(0, 4) < 2010) continue;

      const district = cache.get(stateCode + String(r.City || r.district || '')) || null;
      const drow = district || resolveDistrict(stateCode, perVehicle ? r.City : r.district);
      if (!drow) continue;
      cache.set(stateCode + String(r.City || r.district || ''), drow);

      let cat, count;
      if (perVehicle) {
        // Heuristic: 2W-only makes → 2W; the rest → 4W. (Dataset has no category col.)
        cat = ['Ola Electric', 'Ather Energy', 'TVS Motor'].includes(r.Make) ? '2W' : '4W';
        count = 1;
      } else {
        cat = canonCategory(r.category);
        count = Math.max(0, parseInt(r.count, 10) || 0);
        if (cat === 'BUS') count = Math.max(0, Math.round(count));
      }
      if (!cat) continue;

      (perVehicle ? upsum : upset).run(stateCode, drow.id, month, cat, count);
      stats.skipped--; // count it as loaded
      stats.loaded++;
      stats.months.add(month);
    }
  });
  run();

  // Track the ingested window in meta — take the union with the existing window.
  if (stats.months.size) {
    const m = Array.from(stats.months).sort();
    const curFirst = require('../db').getMeta('data_window_first');
    const curLast = require('../db').getMeta('data_window_last');
    setMeta('data_window_first', !curFirst || m[0] < curFirst ? m[0] : curFirst);
    setMeta('data_window_last', !curLast || m[m.length - 1] > curLast ? m[m.length - 1] : curLast);
  }
  setMeta('last_updated', new Date().toISOString());
  setMeta('last_source', `csv:${stats.schema}`);
  stats.months = Array.from(stats.months).sort();
  return stats;
}

/** Convenience: ingest the bundled per-vehicle sample dataset. */
function ingestBundledSample() {
  return ingestCsv(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', 'sample', 'India_EV_Dataset.csv'), 'utf8'));
}

module.exports = { ingestCsv, ingestBundledSample, resolveDistrict, resolveState };
