/**
 * scripts/load-sample-csv.js — load the bundled per-vehicle India EV dataset
 * (data/sample/India_EV_Dataset.csv) into the registrations table.
 *
 * The CSV (also available as a downloadable upload-sample from the UI) contains
 * one row per vehicle: City, State, Model Year, Make/Model, EV Type, range, MSRP.
 * The ingest service aggregates it to district × month (year) × category.
 */
const path = require('path');
const { ingestBundledSample } = require(path.join('..', 'backend', 'src', 'data', 'csvIngest'));

ingestBundledSample()
  .then((stats) => console.log('[sample-csv] loaded:', JSON.stringify(stats)))
  .catch((e) => { console.error('[sample-csv] failed:', e.message); process.exit(1); });
