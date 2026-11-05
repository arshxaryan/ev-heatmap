/**
 * All REST routes. Every handler validates input, returns JSON and – on error –
 * { error: "..."} with a proper status code so the frontend can show fallbacks.
 */
const express = require('express');
const { db, getMeta } = require('../db');
const { computeGap, dataWindow, monthShift, ROLLING_WINDOW } = require('../services/gap');
const { ingestCsv } = require('../data/csvIngest');
const upload = require('multer')({ storage: require('multer').memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router = express.Router();

const nice = (e) => { console.error('[api]', e); return { error: e.message || 'Internal error' }; };

// ---------------------------------------------------------------- meta/stats
router.get('/meta', (_req, res) => {
  try {
    res.json({
      lastUpdated: getMeta('last_updated'),
      lastSource: getMeta('last_source'),
      window: dataWindow(),
      gapWindowMonths: ROLLING_WINDOW,
    });
  } catch (e) { res.status(500).json(nice(e)); }
});

router.get('/states', (_req, res) => {
  try {
    res.json(db.prepare('SELECT code, name, type, lat, lon FROM regions ORDER BY name').all());
  } catch (e) { res.status(500).json(nice(e)); }
});

router.get('/districts', (req, res) => {
  try {
    const { state } = req.query;
    if (!state) return res.status(400).json({ error: 'state code is required' });
    res.json(db.prepare('SELECT id, name, lat, lon FROM districts WHERE state_code = ? ORDER BY name').all(state));
  } catch (e) { res.status(500).json(nice(e)); }
});

router.get('/stats', (_req, res) => {
  try {
    const win = dataWindow();
    const totals = db.prepare(`
      SELECT SUM(count) AS total,
             SUM(CASE WHEN category='2W' THEN count ELSE 0 END) AS tw,
             SUM(CASE WHEN category='3W' THEN count ELSE 0 END) AS th,
             SUM(CASE WHEN category='4W' THEN count ELSE 0 END) AS fw,
             SUM(CASE WHEN category='BUS' THEN count ELSE 0 END) AS bus
      FROM registrations WHERE month > ? AND month <= ?`).get(monthShift(win.last, -12), win.last);
    const nationalGap = computeGap({ dimension: 'state', month: undefined }).rows;
    const evs = nationalGap.reduce((a, r) => a + r.evs, 0);
    const chargers = nationalGap.reduce((a, r) => a + r.chargers, 0);
    const ratio = chargers ? Math.round(evs / chargers * 10) / 10 : null;
    const chargerMix = db.prepare("SELECT kind, COUNT(*) c FROM chargers GROUP BY kind").all();
    res.json({
      evLast12Months: totals.tw + totals.th + totals.fw + totals.bus,
      byCategory: { '2W': totals.tw, '3W': totals.th, '4W': totals.fw, BUS: totals.bus },
      evStock: evs, chargers, evsPerCharger: ratio,
      chargerMix,
      lastUpdated: getMeta('last_updated'),
      window: win,
    });
  } catch (e) { res.status(500).json(nice(e)); }
});

// ------------------------------------------------------------ registrations
router.get('/registrations', (req, res) => {
  try {
    const { state = null, district = null, category = null } = req.query;
    let { from = null, to = null } = req.query;
    const win = dataWindow();
    from = from && /^\d{4}-\d{2}$/.test(from) ? from : win.first;
    to = to && /^\d{4}-\d{2}$/.test(to) ? to : win.last;

    const where = ['month >= ?', 'month <= ?'];
    const params = [from, to];
    if (state) { where.push('state_code = ?'); params.push(state); }
    if (category) { where.push('category = ?'); params.push(category); }
    if (district) { where.push('district_id = ?'); params.push(district); }

    const rows = db.prepare(`
      SELECT month, category, SUM(count) AS count
      FROM registrations
      WHERE ${where.join(' AND ')}
      GROUP BY month, category
      ORDER BY month
    `).all(...params);

    // Shape: [{ month, '2W': n, '3W': n, '4W': n, BUS: n, total: n }]
    const byMonth = new Map();
    for (const r of rows) {
      const o = byMonth.get(r.month) || { month: r.month };
      o[r.category] = r.count; o.total = (o.total || 0) + r.count;
      byMonth.set(r.month, o);
    }
    for (const o of byMonth.values()) for (const c of ['2W', '3W', '4W', 'BUS']) o[c] = o[c] || 0;

    res.json({ from, to, series: Array.from(byMonth.values()) });
  } catch (e) { res.status(500).json(nice(e)); }
});

// ----------------------------------------------------------------- chargers
router.get('/chargers', (req, res) => {
  try {
    const { state = null, kind = null, district = null, near = null, limit = '2000' } = req.query;
    const where = [];
    const params = [];
    if (state) { where.push('state_code = ?'); params.push(state); }
    if (kind) { where.push('kind = ?'); params.push(kind); }
    if (district) { where.push('district_id = ?'); params.push(district); }
    let sql = 'SELECT id, state_code, district_id, name, operator, kind, kw, connector, lat, lon, source FROM chargers';
    if (where.length) sql += ' WHERE ' + where.join(' AND ');

    let rows = db.prepare(sql).all(...params);
    if (near) {
      // "near" = lat,lon — return the K nearest with distance attached.
      const [lat, lon] = String(near).split(',').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const R = 6371, rad = Math.PI / 180;
        rows = rows.map((r) => {
          const dLon = (r.lon - lon) * rad, dLat = (r.lat - lat) * rad;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(r.lat * rad) * Math.sin(dLon / 2) ** 2;
          return { ...r, distanceKm: Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10 };
        });
        rows.sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }
    const lim = Math.min(parseInt(limit, 10) || 2000, 20000);
    rows = rows.slice(0, lim);
    res.json({ count: rows.length, items: rows });
  } catch (e) { res.status(500).json(nice(e)); }
});

// ---------------------------------------------------------------------- gap
router.get('/gap', (req, res) => {
  try {
    const { dimension = 'state', state = null, category = null, kind = null } = req.query;
    const { month = null } = req.query;
    if (dimension === 'district' && !state) return res.status(400).json({ error: 'dimension=district requires state parameter' });
    if (kind && !['AC', 'DC'].includes(kind)) return res.status(400).json({ error: 'kind must be AC or DC' });
    if (category && !['2W', '3W', '4W', 'BUS'].includes(category)) return res.status(400).json({ error: 'category must be 2W|3W|4W|BUS' });
    const result = computeGap({ dimension, state, category, chargerKind: kind, month });
    res.json(result);
  } catch (e) { res.status(500).json(nice(e)); }
});

// --------------------------------------------------------------- trend for a district
router.get('/trend', (req, res) => {
  try {
    const { districtId, state } = req.query;
    if (!districtId && !state) return res.status(400).json({ error: 'districtId or state required' });
    const where = districtId ? 'district_id = ?' : 'state_code = ?';
    const v = districtId || state;
    const rows = db.prepare(`
      SELECT month, category, SUM(count) count FROM registrations WHERE ${where} GROUP BY month, category ORDER BY month
    `).all(v);
    const byMonth = new Map();
    rows.forEach((r) => {
      const o = byMonth.get(r.month) || { month: r.month, '2W': 0, '3W': 0, '4W': 0, BUS: 0, total: 0 };
      o[r.category] = r.count; o.total += r.count;
      byMonth.set(r.month, o);
    });
    res.json({ series: Array.from(byMonth.values()) });
  } catch (e) { res.status(500).json(nice(e)); }
});

// ------------------------------------------------------------------ upload
router.post('/upload/registrations', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Attach a CSV file as "file"' });
    const stats = await ingestCsv(req.file.buffer.toString('utf8'));
    res.json({ ok: true, ...stats });
  } catch (e) { res.status(400).json({ error: 'CSV parse failed: ' + e.message }); }
});

// ------------------------------------------------------------ refresh (manual)
const { schedulerStatus } = require('../scheduler');
router.get('/jobs/status', (_req, res) => { try { res.json(schedulerStatus()); } catch (e) { res.status(500).json(nice(e)); } });

module.exports = router;
