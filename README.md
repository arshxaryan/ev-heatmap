# ⚡ EV Gap India

**An interactive heat map of EV adoption (Vahan registrations) vs public charging station
availability — showing where India's charging gaps are.**

Live layers: EV registration density · clustered charging stations · **Charging Gap Index**
(EVs per charger, percentile-normalized, colorblind-safe teal→red scale).

Built for policymakers, charging operators, students and EV buyers.

---

## ✨ Features

| Feature | Where |
| --- | --- |
| Full-screen India map (Leaflet + leaflet.heat + markercluster) | `/map` |
| Toggleable layers: EV heat · charger clusters · gap bubbles | map overlay switches |
| Gap Index legend (always visible) | map bottom-left |
| Filters: state, vehicle type (2W/3W/4W/Bus), charger type (AC/DC fast) | filter bar |
| State/district side panel: EVs, chargers, EVs/charger, monthly trend, nearest chargers | click a bubble |
| Top-10 underserved states/districts + CSV & PNG export | below the map |
| Time slider + play button (monthly animation, 24-mo rolling gap window) | map bottom-right |
| Compare two states side by side | `/compare` |
| Insights: national trend, EV mix, worst/best served, key findings | `/insights` |
| Methodology & data sources | `/methodology` |
| Dark/light mode, mobile-first responsive layout | nav toggle |
| Skeleton loaders + readable error states on every API surface | everywhere |
| CSV upload fallback (canonical or per-vehicle schema, auto-detected) | `/map` → Data pipeline card |

## 🗂 Folder structure

```
EV Gap India/
├── backend/                 # Node/Express REST API + SQLite (better-sqlite3)
│   ├── src/
│   │   ├── server.js        # express app, auto-seeds on first boot
│   │   ├── config.js        # all knobs, .env-overridable
│   │   ├── scheduler.js     # node-cron daily refresh (Vahan attempt + OCM)
│   │   ├── db/              # connection, schema, deterministic seed
│   │   ├── routes/api.js    # /api/registrations, /chargers, /gap, /stats, ...
│   │   ├── services/        # gap-index math, ocm.js, vahan.js
│   │   └── data/csvIngest.js# CSV mapper (canonical + per-vehicle schemas)
│   └── data/ev-gap.db       # created at runtime
├── frontend/                # React 18 + Vite + Tailwind + Leaflet + Recharts
│   └── src/{api,components,map,pages,data}
├── data/
│   ├── geo/india-geo.js     # source of truth: states/UTs + district centroids
│   └── sample/India_EV_Dataset.csv  # bundled per-vehicle sample (upload-ready)
├── scripts/                 # ingestion entry points for cron
│   ├── fetch-vahan.js       # daily Vahan path (documented honest fallbacks)
│   ├── load-sample-csv.js   # load the bundled CSV into the DB
│   └── refresh-all.js       # trigger the full refresh pipeline
├── docs/METHODOLOGY.md      # standalone methodology note (same as /methodology)
├── docker-compose.yml       # backend + frontend(nginx)
└── .env.example
```

## 🚀 Run locally

Prereqs: Node ≥ 18 (tested on 22/24), npm.

```bash
# 1) Backend (auto-seeds realistic sample data on first boot)
cd backend
cp .env.example .env          # optional: add OCM_API_KEY for live charger data
npm install
npm run dev                   # http://localhost:4000/api/health

# 2) Frontend (proxies /api to :4000)
cd ../frontend
npm install
npm run dev                   # http://localhost:5173
```

The app renders immediately from the seeded dataset. To additionally load the bundled
per-vehicle sample CSV into the DB:

```bash
cd backend && npm run load-sample-csv
```

## 🔄 Data pipeline

**EV registrations (Vahan).** There is *no official public API*. The pipeline:
1. Daily cron (default 02:30) attempts best-effort fetches (`backend/src/services/vahan.js`);
2. Recommended path: post officially exported state/district report CSVs to
   `POST /api/upload/registrations` (schema auto-detected — monthly aggregate
   `state,district,month,category,count` **or** per-vehicle rows like
   `data/sample/India_EV_Dataset.csv`);
3. When neither is available, the seeded mock dataset keeps everything working, clearly labelled.

**Charging stations (Open Charge Map).** Set `OCM_API_KEY` (free key from
openchargemap.org/site/develop/api) and the same cron fetches all Indian POIs
(lat/lon, operator, AC/DC, kW, connector). Optional BEE / data.gov.in import slots are
documented in `services/ocm.js`.

```bash
# trigger a full refresh manually
cd backend && npm run refresh
```

## 🔌 API overview

| Endpoint | Description |
| --- | --- |
| `GET /api/health`, `GET /api/meta` | liveness · last-updated + data window |
| `GET /api/stats` | headline national numbers + charger mix |
| `GET /api/states`, `GET /api/districts?state=` | filter lists |
| `GET /api/registrations?state&category&from&to` | monthly series (stacked-ready) |
| `GET /api/chargers?state&kind&near=lat,lon` | station POIs (near → distance sorted) |
| `GET /api/gap?dimension=state\|district&state&category&kind&month` | **the gap layer** |
| `GET /api/trend?state` or `?districtId=` | per-region monthly trend |
| `POST /api/upload/registrations` | CSV fallback (multipart `file`) |
| `GET /api/jobs/status` | scheduler status |

## 🐳 Docker

```bash
cp backend/.env.example backend/.env
docker compose up --build
# frontend on http://localhost:5173 (nginx proxies /api → backend:4000)
```

## 🔐 Push this repo to GitHub

Secrets never leave your machine — run the helper after pasting credentials
into the **git-ignored** `backend/.env`:

1. Create a token at <https://github.com/settings/tokens> (fine-grained, **Contents: Read & Write**, or classic with `repo` scope). It starts with `ghp_` / `github_pat_`.
2. In `backend/.env`, set `GITHUB_TOKEN`, `GITHUB_USERNAME`, `GITHUB_REPO=ev-gap-india` (file tells you how; it is not committed).
3. Push (creates the repo if missing):
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\push-to-github.ps1
   ```
   → https://github.com/<you>/ev-gap-india

See `SECURITY.md` for the full threat model (helmet, rate limiting, CORS allow-list, optional API key on uploads).


## ☁️ Firebase Hosting + Cloud Run (recommended free-ish path)

Firebase Hosting serves the React SPA free; the `/api/**` rewrite routes
straight into the backend container on **Cloud Run** (requires a Blaze project;
low traffic stays inside the free grant). SQLite lives in the container FS, so
demo data re-seeds on cold start — see "Persistence" below.

One-time setup:

```bash
npm i -g firebase-tools        # Firebase CLI
gcloud auth login              # Google Cloud CLI (same account)
.firebaserc: put YOUR Firebase project id in projects.default
```

Deploy (frontend build + Cloud Run + hosting + `/api` rewrite) in one shot:

```powershell
$env:GCP_PROJECT = "your-firebase-project"
powershell -ExecutionPolicy Bypass -File scripts\deploy-firebase.ps1
# → https://your-firebase-project.web.app
```

Files involved: `firebase.json` (hosting + SPA + `/api/**` → Cloud Run rewrite +
asset caching), `.firebaserc`, root `Dockerfile` (backend image), `.dockerignore`.

**Persistence caveat:** SQLite writes to the container's ephemeral disk. For a
demo this is fine (auto-seeds on boot); for durable data either set a minimum
of one Cloud Run instance, or switch the backend to Cloud SQL Postgres (schema
maps 1:1 — see Methodology → Scaling notes).

**Scheduled refresh on Firebase:** in-process cron is disabled under serverless.
Create a Cloud Scheduler job (daily 02:30) POSTing to
`https://your-firebase-project.web.app/api/jobs/refresh` with header
`x-api-key: <API_KEY>` (set `API_KEY` on the Cloud Run service when you do).

**Free-only alternative:** Firebase Hosting free tier + the backend on
Render/Railway free tier → set `VITE_API_URL=https://your-backend.onrender.com/api`
when building the frontend, and skip the `/api` rewrite in `firebase.json`.

## ☁️ Vercel/Netlify alternative
Frontend → Vercel/Netlify (build `frontend/`, set `VITE_API_URL`, add `/api`
rewrite via `frontend/vercel.json`); backend → Render/Railway as above.


## 🧪 Quality notes

* Every API surface has loading (skeletons), error (retryable notes) and empty states.
* Single source of truth for the gap scale (teal→sand→orange→red, CB-safe) shared by
  map, legend, panels and tables.
* Seed generator is deterministic (seeded PRNG) — demos/screenshots are reproducible.

## 📄 License / credits

MIT. Data thanks: Vahan/Parivahan (MoRTH), Open Charge Map contributors,
OpenStreetMap + CARTO. See `/methodology`.
