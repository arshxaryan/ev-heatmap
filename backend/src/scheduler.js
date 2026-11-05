/**
 * Scheduled data refresh (node-cron).
 *
 * Daily job (default 02:30 server time, REFRESH_CRON):
 *   1. Try a live Vahan fetch → no official API exists, so this usually
 *      degrades gracefully (see services/vahan.js).
 *   2. Refresh chargers from Open Charge Map when OCM_API_KEY is set;
 *      otherwise keep current charger data.
 *   3. Stamp meta.last_updated so the UI can surface "Last updated".
 */
const cron = require('node-cron');
const config = require('./config');
const { getMeta, setMeta, db } = require('./db');
const { refreshFromOcm } = require('./services/ocm');
const { fetchVahanRegistrationReport } = require('./services/vahan');
async function refreshNow(reason = 'manual') {
  const started = Date.now();
  const results = { vahan: null, ocm: null };
  try { results.vahan = await fetchVahanRegistrationReport(); } catch (e) { console.error('[refresh] vahan error', e.message); }
  try { results.ocm = await refreshFromOcm(); } catch (e) { console.error('[refresh] ocm error', e.message); }

  setMeta('last_refresh_at', new Date().toISOString());
  setMeta('last_refresh_reason', reason);
  setMeta('last_refresh_ms', String(Date.now() - started));
  console.log('[refresh] done in', Date.now() - started, 'ms —', JSON.stringify({
    vahan: results.vahan ? `${results.vahan.length} rows` : 'fallback',
    ocm: results.ocm == null ? 'skipped' : `${results.ocm} chargers`,
  }));
  return results;
}

function startScheduler() {
  if (!config.refreshCron) return null;
  const task = cron.schedule(config.refreshCron, () => refreshNow('cron'));
  console.log(`[scheduler] refresh scheduled: "${config.refreshCron}"`);
  if (config.autoRefreshOnStart) setTimeout(() => refreshNow('startup'), 2000);
  return task;
}

function schedulerStatus() {
  return {
    cron: config.refreshCron,
    autoStart: config.autoRefreshOnStart,
    lastRefreshAt: getMeta('last_refresh_at'),
    lastSource: getMeta('last_source'),
    lastUpdated: getMeta('last_updated'),
    registrations: db.prepare('SELECT COUNT(*) c FROM registrations').get().c,
    chargers: db.prepare('SELECT COUNT(*) c FROM chargers').get().c,
  };
}

module.exports = { startScheduler, refreshNow, schedulerStatus };
