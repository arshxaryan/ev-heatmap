/**
 * Gap service — the heart of the app.
 *
 * Gap Index (0–100, higher = underserved):
 *
 *   effectiveChargers = max(# public chargers in filter, 0.5)
 *   gapRaw            = EV stock / effectiveChargers      ("EVs per charger")
 *   gapIndex          = percentile(gapRaw) within the filtered rowset × 100
 *
 *  - "EV stock" = cumulative registrations in the last N months up to the
 *    selected month (rolling 24-month window keeps the index sensitive to
 *    recent growth; see the Methodology page).
 *  - Districts with zero chargers rank worst (they are the real gaps).
 *  - Percentile normalization keeps the color scale comparable across vehicle
 *    categories and charger filters: the same legend applies everywhere
 *    (teal = well served → red = severe gap; colorblind-safe palette).
 */

const { db } = require('../db');

const ROLLING_WINDOW = 24; // months of registrations counted as "stock"

/** Shift "YYYY-MM" by k months (k may be negative). */
function monthShift(month, k) {
  const [y, m] = month.split('-').map(Number);
  const out = y * 12 + (m - 1) + k;
  return `${Math.floor(out / 12)}-${String((out % 12) + 1).padStart(2, '0')}`;
}

/** Data window from the meta table, with sane fallbacks. */
function dataWindow() {
  return {
    first: require('../db').getMeta('data_window_first', '2022-04'),
    last: require('../db').getMeta('data_window_last', '2026-10'),
  };
}

/**
 * Core aggregation for the gap layer.
 *
 * @param {object} q
 * @param {"state"|"district"} q.dimension aggregation level
 * @param {string|null} q.state   restrict to one state code
 * @param {string|null} q.category  "2W"|"3W"|"4W"|"BUS"
 * @param {string|null} q.chargerKind "AC"|"DC"|null
 * @param {string} q.month  "YYYY-MM" — end of the rolling window
 * @returns {{ windowStart: string, rows: object[], lastUpdated: string }}
 */
function computeGap({ dimension = 'state', state = null, category = null, chargerKind = null, month = null } = {}) {
  const { getMeta } = require('../db');
  const win = dataWindow();
  month = month && /^\d{4}-\d{2}$/.test(month) ? month : win.last;
  const windowStart = monthShift(month, -(ROLLING_WINDOW - 1));

  // ---- EV stock per entity -------------------------------------------------
  const evParams = [month, windowStart];
  const evWhere = ['r.month <= ?', 'r.month >= ?'];
  if (state) { evWhere.push('r.state_code = ?'); evParams.push(state); }
  if (category) { evWhere.push('r.category = ?'); evParams.push(category); }
  const evRows = db.prepare(`
    SELECT ${dimension === 'district' ? 'r.district_id' : 'r.state_code'} AS dim, SUM(r.count) AS evs
    FROM registrations r
    WHERE ${evWhere.join(' AND ')}
    GROUP BY dim
  `).all(...evParams);
  const evMap = new Map(evRows.map((r) => [r.dim, r.evs]));

  // ---- chargers per entity --------------------------------------------------
  const chParams = [];
  const chWhere = [];
  if (state) { chWhere.push('c.state_code = ?'); chParams.push(state); }
  if (chargerKind) { chWhere.push('c.kind = ?'); chParams.push(chargerKind); }
  const chRows = db.prepare(`
    SELECT ${dimension === 'district' ? 'c.district_id' : 'c.state_code'} AS dim, COUNT(*) AS chargers
    FROM chargers c
    ${chWhere.length ? 'WHERE ' + chWhere.join(' AND ') : ''}
    GROUP BY dim
  `).all(...chParams);
  const chMap = new Map(chRows.map((r) => [r.dim, r.chargers]));

  // ---- full entity rowset (include zeros: they carry the real gaps) ---------
  const entities = dimension === 'district' && state
    ? db.prepare('SELECT id, name, lat, lon FROM districts WHERE state_code = ?').all(state)
    : db.prepare('SELECT code AS id, name, lat, lon FROM regions').all();

  if (dimension === 'district' && !state) {
    throw new Error('dimension=district requires a state filter');
  }

  let rows = entities.map((e) => {
    const evs = evMap.get(e.id) || 0;
    const chargers = chMap.get(e.id) || 0;
    const gapRaw = Math.round(evs / Math.max(chargers, 0.5) * 10) / 10;
    return {
      ...(dimension === 'district'
        ? { districtId: e.id, district: e.name }
        : { stateCode: e.id, state: e.name }),
      lat: e.lat, lon: e.lon,
      evs, chargers, gapRaw,
    };
  });

  // Add state label for district rows.
  if (dimension === 'district') rows.forEach((r) => { r.state = state; r.stateCode = state; });

  // ---- percentile normalize --------------------------------------------------
  const n = rows.length;
  if (n > 1) {
    const sorted = rows.filter((r) => r.gapRaw > 0).map((r) => r.gapRaw).sort((a, b) => a - b);
    const rank = (x) => {
      if (sorted.length === 0) return 50;
      let lo = 0, hi = sorted.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < x) lo = mid + 1; else hi = mid; }
      // Fractional rank in [0,1]: proportion of values strictly below x (ties share rank).
      return lo / sorted.length;
    };
    rows = rows.map((r) => ({
      ...r,
      gapIndex: Math.round(rank(r.gapRaw) * 100),
    }));
  } else if (n === 1) {
    rows = rows.map((r) => ({ ...r, gapIndex: r.chargers === 0 ? 100 : 0 }));
  }

  rows.sort((a, b) => b.gapIndex - a.gapIndex);

  return { windowStart, month, dimension, rows, lastUpdated: getMeta('last_updated') };
}

module.exports = { computeGap, monthShift, dataWindow, ROLLING_WINDOW };
