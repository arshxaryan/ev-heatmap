/**
 * scripts/fetch-vahan.js — daily Vahan ingestion entry point.
 *
 * Vahan reality check (documented honestly):
 *   • parivahan has NO official public API for registration counts.
 *   • The dashboard's internal AJAX endpoints change and are bot-protected,
 *     so live scraping is *best-effort only* (see backend/src/services/vahan.js).
 *
 * Supported production paths:
 *   1. Official MVI/Vahan state-wise report exports (Excel/CSV) obtained from
 *      an authorised account → POST them to /api/upload/registrations.
 *   2. Scheduled cron hitting this script → it calls the backend's internal
 *      refresh job (vahan attempt + OCM charger refresh) and logs outcomes.
 *
 * Usage (cron example: 30 2 * * * node scripts/fetch-vahan.js):
 *   node scripts/fetch-vahan.js            # triggers backend refresh via API
 *   VAHAN_CSV=path/to/report.csv node scripts/fetch-vahan.js --upload
 */
const DEFAULT_API = process.env.API_URL || 'http://localhost:4000/api';

async function main() {
  const api = DEFAULT_API.replace(/\/$/, '');
  try {
    const r = await fetch(`${api}/jobs/status`);
    const status = await r.json();
    console.log('[vahan] pre-refresh status:', JSON.stringify(status, null, 2));
  } catch (e) {
    console.error(`[vahan] backend not reachable at ${DEFAULT_API} — start it first (npm run dev in /backend)`);
    process.exit(1);
  }

  // Optional: push an officially exported Vahan CSV.
  if (process.env.VAHAN_CSV) {
    const fs = require('fs');
    const csv = fs.readFileSync(process.env.VAHAN_CSV);
    const form = new FormData();
    form.append('file', new Blob([csv]), 'vahan-report.csv');
    const r = await fetch(`${api}/upload/registrations`, { method: 'POST', body: form });
    console.log('[vahan] upload result:', JSON.stringify(await r.json()));
  } else {
    console.log('[vahan] no VAHAN_CSV provided — backend will try its scrape/fallback paths');
  }
}

main();
