/**
 * scripts/refresh-all.js — manual trigger of the scheduled refresh pipeline
 * (Vahan best-effort fetch + Open Charge Map + meta stamps).
 * Run through the backend's scheduler for consistent endpoints:
 *   node scripts/refresh-all.js
 */
const { refreshNow } = require('../backend/src/scheduler');

refreshNow('manual-script')
  .then((r) => console.log('[refresh] result:', JSON.stringify(r && { vahan: r.vahan && r.vahan.length, ocm: r.ocm })))
  .then(() => process.exit(0));
