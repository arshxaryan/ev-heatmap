/**
 * Central config — everything overridable via .env (see ../.env.example).
 * Constants that shape the mock/sample data live here so the seed stays tunable.
 */
require('dotenv').config();

const path = require('path');

// Origins that must always work for this app's real deployments, so a stale
// dashboard env var can never lock the live sites out of the API.
const DEFAULT_CORS_ORIGINS = [
  'https://ev-gap-arshx.web.app',
  'https://careercompass-77eae.web.app',
  'https://careercompass-77eae.firebaseapp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const envCorsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const corsOrigins = envCorsOrigins.includes('*') || envCorsOrigins.length === 0
  ? '*'
  : [...new Set([...envCorsOrigins, ...DEFAULT_CORS_ORIGINS])];

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  databaseFile: process.env.DATABASE_FILE || path.join(__dirname, '..', 'data', 'ev-gap.db'),

  // Daily Vahan + OCM refresh, 02:30 server time. Override with a cron string.
  refreshCron: process.env.REFRESH_CRON || '30 2 * * *',
  autoRefreshOnStart: String(process.env.AUTO_REFRESH_ON_START || '') === 'true',

  // Open Charge Map (https://openchargemap.org/site/develop/api) — free API key.
  ocmApiKey: process.env.OCM_API_KEY || '',
  ocmBaseUrl: process.env.OCM_BASE_URL || 'https://api.openchargemap.io/v3/poi',

  // Vahan dashboard has no official public API. services/vahan.js attempts a
  // best-effort scrape of public report endpoints; falls back to sample data.
  vahanBaseUrl: process.env.VAHAN_BASE_URL || 'https://vahan.parivahan.gov.in/vahan4/dashboard',
  vahanUserAgent: process.env.VAHAN_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EVGapIndia/1.0',

  // CORS origins allowed to call the API (comma separated). "*" allows all.
  corsOrigins,

  // Optional shared secret for POST endpoints (uploads). When set, POSTs
  // require header x-api-key: <key>. Never commit real keys — .env only.
  apiKey: process.env.API_KEY || '',

  // ---- mock/data-shape constants ----
  seed: {
    // Monthly registration series window.
    firstMonth: '2022-04',
    lastMonthYear: 2026,
    lastMonthIndex: 10, // Nov 2026 is "today" is Nov 2026; last full month ≈ Oct 2026
    // Approximate national monthly EV registrations at seed start (Vahan reality ≈ 1.5–2 L/mo in 2025).
    baseNationalMonthly: 90000,
  },
};
