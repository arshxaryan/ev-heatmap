/**
 * SQLite access layer (better-sqlite3).
 *
 * Why SQLite for the prototype: zero-ops, file-based, sync API is plenty fast
 * for ~50k rows. The schema is deliberately simple so moving to PostgreSQL +
 * PostGIS later is a copy-paste of the CREATE TABLEs plus a driver swap — see
 * docs/methodology.md "Scaling notes".
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });

const db = new Database(config.databaseFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS regions (
  code TEXT PRIMARY KEY,             -- state/UT code, e.g. "MH"
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('state','ut')),
  lat REAL NOT NULL,
  lon REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS districts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state_code TEXT NOT NULL REFERENCES regions(code),
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  UNIQUE(state_code, name)
);
CREATE INDEX IF NOT EXISTS idx_districts_state ON districts(state_code);

-- One row per state+district+month+vehicle-category.
-- month: "YYYY-MM"; category: "2W"|"3W"|"4W"|"BUS".
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state_code TEXT NOT NULL REFERENCES regions(code),
  district_id INTEGER NOT NULL REFERENCES districts(id),
  month TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('2W','3W','4W','BUS')),
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(state_code, district_id, month, category)
);
CREATE INDEX IF NOT EXISTS idx_reg_month ON registrations(month);
CREATE INDEX IF NOT EXISTS idx_reg_district ON registrations(district_id, month);
CREATE INDEX IF NOT EXISTS idx_reg_state_month_cat ON registrations(state_code, month, category);

-- Public charging stations (from OCM / BEE / data.gov.in import / mock seed).
-- kind: "AC"|"DC"; kw: rated output; connector: human-readable connector standard.
CREATE TABLE IF NOT EXISTS chargers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state_code TEXT NOT NULL REFERENCES regions(code),
  district_id INTEGER REFERENCES districts(id),
  name TEXT NOT NULL,
  operator TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('AC','DC')),
  kw REAL NOT NULL DEFAULT 0,
  connector TEXT NOT NULL DEFAULT '',
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'sample'   -- sample | ocm | bee | manual
);
CREATE INDEX IF NOT EXISTS idx_chargers_state ON chargers(state_code);
CREATE INDEX IF NOT EXISTS idx_chargers_kind ON chargers(kind);

-- Key/value metadata: last_updated, last_source, record counts, etc.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

db.exec(SCHEMA);

/** Read a meta key (or `fallback` when unset). */
function getMeta(key, fallback = null) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

/** Upsert a meta key. */
function setMeta(key, value) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

module.exports = { db, getMeta, setMeta };
