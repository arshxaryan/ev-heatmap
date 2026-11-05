/**
 * Vahan ingestion — best-effort, honest about the limits.
 *
 * The Vahan dashboard (vahan.parivahan.gov.in/vahan4/dashboard) has *no
 * official public API*. Its data is rendered via internal AJAX endpoints
 * that change over time and are bot-protected. This module therefore:
 *
 *   1. Attempts the public report endpoints used in the past
 *      (`/vb_reports/GetDashboardVoilationReport` variants) with a browser-like
 *      User-Agent and short timeouts.
 *   2. On ANY failure (or when VAHAN_BASE_URL is unreachable), logs a clear
 *      warning and leaves the database untouched — the app degrades gracefully
 *      to the mock/sample dataset or the latest CSV upload.
 *
 * `scripts/fetch-vahan.js` documents how operators export official state-wise
 * MVI/Vahan reports (Excel/CSV) and push them through POST /api/upload — the
 * supportable production route.
 */
const axios = require('axios');
const config = require('../config');

const CATEGORIES = ['2W', '3W', '4W', 'BUS'];

async function fetchVahanRegistrationReport() {
  const url = `${config.vahanBaseUrl}/vb_reports/GstStateWiseReport`;
  try {
    const { data } = await axios.get(url, {
      params: { from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
      timeout: 15000,
      headers: { 'User-Agent': config.vahanUserAgent, Accept: 'application/json, text/plain, */*' },
    });
    // The dashboard historically returns { data: [ { state, category, count } ... ] } shapes.
    const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : null);
    if (!rows) throw new Error('unrecognised response shape');
    const normalized = rows
      .map((r) => ({
        state: r.state || r.State || r.STATE,
        category: String(r.category || r.Category || '').toUpperCase().replace(/[^234]/g, (m) => ({ 2: '2W', 3: '3W', 4: '4W' }[m] || '')),
        count: parseInt(r.count || r.Count || 0, 10),
      }))
      .filter((r) => r.state && r.count > 0 && CATEGORIES.includes(r.category));
    if (!normalized.length) throw new Error('no usable rows after normalisation');
    return normalized;
  } catch (err) {
    console.warn(`[vahan] live fetch failed (${err.message}) — falling back; upload CSV/scheduler will maintain data`);
    return null;
  }
}

module.exports = { fetchVahanRegistrationReport };
