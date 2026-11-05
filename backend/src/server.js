/**
 * EV Gap India — REST API server.
 *
 * Endpoints (all JSON):
 *   GET /api/health                     liveness probe
 *   GET /api/meta                       last-updated / data window
 *   GET /api/stats                      headline national stats
 *   GET /api/states, /api/districts     filter dropdowns
 *   GET /api/registrations              monthly series ?state&category&from&to&district
 *   GET /api/chargers                   station points ?state&kind&district&near&limit
 *   GET /api/gap                        THE layer  ?dimension&state&category&kind&month
 *   GET /api/trend                      per-state/district monthly series
 *   GET /api/jobs/status                scheduler status
 *   POST /api/upload/registrations      CSV upload fallback (multipart "file")
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes/api');

// Ensure a database exists: auto-seed sample data on first boot so the app
// renders out of the box (see db/seed.js). `SEED=off` disables for prod boots
// where you bring your own DB.
const { seedDatabase } = require('./db/seed');
const { db, getMeta } = require('./db');
if (process.env.SEED !== 'off' && !getMeta('seed_version')) {
  console.log('[boot] no seed found — generating sample dataset (first run)');
  seedDatabase();
}

const app = express();
// ---- Security hardening ----------------------------------------------------
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,  // Leaflet/OSM tiles need img-src flexibility; SPA via nginx adds its own headers
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow tile/map fetches cross-origin
}));
// Basic rate limit: 300 req / 15 min per IP (generous for map UX, tight for abuse).
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down' },
});
app.use('/api', limiter);

// Upload endpoints accept an optional shared API key (set API_KEY to enforce).
function requireApiKey(req, res, next) {
  if (!config.apiKey) return next();
  const k = req.get('x-api-key') || req.query.key;
  if (k === config.apiKey) return next();
  return res.status(401).json({ error: 'Unauthorized — missing/invalid x-api-key' });
}

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, env: config.env, lastUpdated: getMeta('last_updated') }));
// API key (when configured) guards mutating requests only — reads stay public for the map.
app.use('/api', (req, res, next) => (req.method === 'POST' ? requireApiKey(req, res, next) : next()), routes);

// 404 + error handling: JSON responses the frontend can render.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
  console.error('[server]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// In-process cron is unreliable under serverless (instances cycle); on Cloud
// Functions/Run we skip it and call POST /api/refresh from Cloud Scheduler.
if (process.env.FUNCTION_TARGET || process.env.FIREBASE_CONFIG) {
  console.log('[server] serverless mode — listening handled by platform');
} else {
  app.listen(config.port, () => {
    console.log(`[server] EV Gap India API on http://localhost:${config.port}`);
    require('./scheduler').startScheduler();
  });
}

module.exports = { app };
