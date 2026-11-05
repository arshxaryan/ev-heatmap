# EV Gap India — Methodology note (standalone)

*Same content as the in-app `/methodology` page, kept as a versioned document.*

## 1. The Gap Index

For each state or district, computed against the currently selected vehicle category
(or all categories) and charger type (or both):

```
effectiveChargers = max(# public chargers in scope, 0.5)
EV stock          = # EV registrations in the last 24 months up to the selected month
gapRaw            = EV stock ÷ effectiveChargers        ("EVs per charger")
gapIndex (0–100)  = percentile of gapRaw within the currently filtered rowset × 100
```

Design decisions:

* **24-month rolling window.** Vahan stores lifetime registrations; a rolling window keeps
  the ratio sensitive to recent growth (a district can "improve" as chargers catch up) and
  avoids decades-old registrations dominating. It trades exact on-road fleet counts for recency.
* **Percentile normalization.** Raw EV/charger ratios are dominated by megacity outliers;
  percentiles keep the color scale interpretable in every view. The mapping is monotonic:
  a lower gapIndex always means better served *within the current view*. Absolute meaning
  comes from `gapRaw` (EVs per charger), displayed beside every index.
* **Zero chargers ⇒ worst.** A district with EVs and zero recorded public chargers ranks at
  the top of the gap index (gapRaw is floored by effectiveChargers=0.5 so districts with and
  without chargers still order sensibly).
* **Color scale.** Teal → sand → orange → red, an Okabe–Ito-inspired colorblind-safe ramp that
  avoids the pure-green/pure-red axis. The identical ramp is used by the map legend, panels
  and ranking tables.

## 2. Data sources

| Source | What we take | How it arrives |
| --- | --- | --- |
| Vahan dashboard (parivahan.gov.in) | state/district-month EV registrations by category (2W, 3W, 4W, bus) | No official public API → scheduled best-effort fetch, official report CSV upload, or clearly-labelled sample data |
| Open Charge Map (openchargemap.org) | charging point POIs for India: lat/lon, operator, AC/DC, kW, connector types | REST ingest (free API key), paginated, daily |
| BEE / data.gov.in charger datasets | national public-charging census/operators (optional) | documented import slot in `services/ocm.js` |
| OpenStreetMap + CARTO | basemap tiles | Leaflet raster tiles |

## 3. Data limitations

1. **Registered ≠ on-road.** A registration count is not a fleet count; scrapes/exports and
   the rolling window both bias the ratio's absolute level (not, though, its relative goal).
2. **Charger under-reporting.** OCM is crowdsourced; private/captive and many public-sector
   charging points are missing, especially outside metros. Treat charger counts as a floor.
3. **District heat is point-based** (district centroids, ~300 districts) in the prototype —
   visual density is indicative. Production should swap in an LGD/Survey-of-India district
   GeoJSON for a true choropleth.
4. **Sample data regime.** When neither live sources nor uploads are present, the app runs on
   a seeded, documented mock generator (`backend/src/db/seed.js`). Its numbers are plausible
   (~90k→~2L/month national, 2W-dominant mix, festive-season spikes) but *simulated*; the
   UI labels them via the "sample" source mode.
5. **Percentile relativity.** gapIndex answers "worst-served relative to others in view" —
   it is not an absolute infrastructure scorecard.

## 4. Credits

* Vahan / Sarathi (MoRTH, NIC) — vehicle registration statistics.
* Open Charge Map contributors — charging point POIs (respective OCM licence).
* OpenStreetMap contributors + CARTO — basemaps.
* BEE / data.gov.in — national charging-infrastructure datasets.
* OSS stack: Node, Express, SQLite, React, Vite, Tailwind, Leaflet (+ heat, markercluster),
  Recharts, node-cron.

## 5. Scaling notes (prototype → production)

* SQLite → PostgreSQL + PostGIS: the four tables (`regions`, `districts`, `registrations`,
  `chargers`) map 1:1; add GIST indexes and raster/tile pre-aggregation if true choropleths ship.
* Percentile computation can be precomputed per (dimension × category × kind × month)
  in a materialized view instead of at request time.
* Cron → durable queue (BullMQ/Celery) when scraping per-state on official credentials.
