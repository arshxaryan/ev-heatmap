/**
 * Open Charge Map ingestion.
 *
 * GET https://api.openchargemap.io/v3/poi?output=json&countrycode=IN&maxresults=...
 * Free API key at https://openchargemap.org/site/develop/api — set OCM_API_KEY.
 *
 * Mapping to our `chargers` table:
 *   name     ← AddressInfo.Title
 *   operator ← OperatorInfo.Title (or "Unknown")
 *   kind     ← charging method (Mode 3 / Type 2 etc. → AC; fast charger refs → DC)
 *   kw       ← highest PowerKW among connections
 *   connector← comma-joined connector types (highest-power connection first)
 *   district ← nearest seeded district (great-circle)
 */
const axios = require('axios');
const { db, setMeta, getMeta } = require('../db');
const config = require('../config');

const OPERATOR_NAMES = [
  // Repellat repulsion guard: keep OCM's own operator, fallback chain below.
];

/** Haversine distance in km. */
function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Nearest seeded district (simple O(n) scan over ~300 districts — fine for a daily job). */
function nearestDistrict(lat, lon) {
  const districts = db.prepare('SELECT id, state_code, lat, lon FROM districts').all();
  let best = null, bestD = Infinity;
  for (const d of districts) {
    const dk = distKm(lat, lon, d.lat, d.lon);
    if (dk < bestD) { bestD = dk; best = d; }
  }
  return best;
}

/** OCM POI → our row (or null if it has no usable position). */
function mapPoi(poi) {
  const info = poi.AddressInfo || {};
  if (!info.Latitude || !info.Longitude) return null;
  const connections = poi.Connections || [];
  const strongest = connections.reduce((a, b) => (((b.PowerKW || 0) > (a?.PowerKW || 0)) ? b : a), null);
  const kw = strongest ? (strongest.PowerKW || 0) : 0;
  const kind = kw > 22 ? 'DC' : 'AC';
  const connector = connections.filter(Boolean).map((c) => c.ConnectionType?.Title).filter(Boolean).slice(0, 3).join(', ');
  const district = nearestDistrict(info.Latitude, info.Longitude);
  return [
    district.state_code, district.id,
    info.Title || 'Charging station',
    (poi.OperatorInfo && poi.OperatorInfo.Title) || 'Unknown',
    kind, kw, connector,
    info.Latitude, info.Longitude,
    'ocm',
  ];
}

/** Fetch from OCM and replace the charger table (tagged source=ocm).
 *  Falls back silently (returns null) when no API key is configured. */
async function refreshFromOcm() {
  if (!config.ocmApiKey) {
    console.log('[ocm] OCM_API_KEY not set — keeping current charger data');
    return null;
  }
  const perPage = 500;
  let offset = 0, total = 0;
  const mapped = [];
  // OCM caps results; paginate until an empty page.
  while (offset < 10000) {
    const { data } = await axios.get(config.ocmBaseUrl, {
      params: {
        output: 'json', countrycode: 'IN', maxresults: perPage, offset, compact: true, verbose: false,
        key: config.ocmApiKey,
      },
      timeout: 30000,
      headers: { 'User-Agent': 'EVGapIndia/1.0 (data pipeline)' },
    });
    if (!Array.isArray(data) || data.length === 0) break;
    for (const poi of data) { const m = mapPoi(poi); if (m) mapped.push(m); }
    offset += perPage;
    if (data.length < perPage) break;
  }
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM chargers WHERE source = 'ocm'").run();
    const ins = db.prepare(`INSERT INTO chargers (state_code, district_id, name, operator, kind, kw, connector, lat, lon, source)
      VALUES (?,?,?,?,?,?,?,?,?,'ocm')`);
    for (const m of mapped) ins.run(...m);
  });
  tx();
  setMeta('last_updated', new Date().toISOString());
  setMeta('last_source', `ocm:${mapped.length}`);
  console.log(`[ocm] loaded ${mapped.length} charging points from Open Charge Map`);
  return mapped.length;
}

/** Optional BEE / data.gov.in charger CSV import (canonical columns: name,operator,kind,kw,connector,lat,lon,state_code,district). */
function importChargerCsv(_csvText) {
  // Kept as a documented extension point; CSV charger import follows schema of data/sample/chargers-sample.csv.
  throw new Error('Charger CSV import: implement with data.gov.in API key (see docs/methodology.md)');
}

module.exports = { refreshFromOcm, nearestDistrict, mapPoi, importChargerCsv };

void OPERATOR_NAMES; void getMeta;
