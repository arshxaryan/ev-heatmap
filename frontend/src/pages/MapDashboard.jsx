import { useCallback, useMemo, useRef, useState } from 'react';
import MapCanvas from '../map/MapCanvas.jsx';
import GapLegend from '../components/GapLegend.jsx';
import TimeSlider from '../components/TimeSlider.jsx';
import SidePanel from '../components/SidePanel.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { Skeleton, ErrorNote } from '../components/Loaders.jsx';
import { useApi, apiUploadRegistrationCsv } from '../api/client.js';
import { CATEGORIES, CATEGORY_LABELS, downloadCsv, downloadPng, fmt, fmtR, gapColor, monthShift } from '../utils';
import { STATES } from '../data/geo';

const VEHICLE_OPTIONS = ['All', ...CATEGORIES];
const KIND_OPTIONS = ['All', 'AC', 'DC'];

/** Filter dropdown shell. */
function Select({ label, value, onChange, options, render = (o) => o, disabled = false }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
      >
        {options.map((o) => <option key={o} value={o}>{render(o)}</option>)}
      </select>
    </label>
  );
}

/** Layer checkbox chip. */
function LayerToggle({ checked, onChange, label, dot }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs shadow-card backdrop-blur focus-within:ring-2 focus-within:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/90">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-brand-500" />
      <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {dot && <span className="h-3 w-6 rounded-full" style={{ background: `linear-gradient(to right, ${dot[0]}, ${dot[1]})` }} aria-hidden />}
    </label>
  );
}

export default function MapDashboard() {
  const meta = useApi('/meta');
  const win = meta.data?.window;
  const [stateCode, setStateCode] = useState('');
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState('');
  const [month, setMonth] = useState(null); // once window loads, we set default via callback below
  const [layers, setLayers] = useState({ ev: true, gap: true, chargers: true });
  const [selection, setSelection] = useState(null); // {kind, name, stateCode, districtId, lat, lon}
  const [panelHide, setPanelHide] = useState(false);
  const [uploadInfo, setUploadInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const mapBoxRef = useRef(null);

  if (win && !month) setMonth(win.last); // default to latest month once meta loads

  const dimension = stateCode ? 'district' : 'state';
  const monthSafe = month && win ? (month < monthShift(win.first, 23) ? monthShift(win.first, 23) : month) : null;

  const gap = useApi('/gap', {
    dimension, state: stateCode || undefined, category: category === 'All' ? undefined : category,
    kind: kind === 'All' ? undefined : kind, month: monthSafe,
  });

  const chargers = useApi('/chargers', {
    state: stateCode || undefined, kind: kind === 'All' ? undefined : kind, limit: '3000',
  });

  // ---- selection panel data ----
  const trend = useApi('/trend', selection ? { state: selection.stateCode, districtId: selection.districtId || undefined } : {});
  const nearChargers = useApi('/chargers', selection
    ? { state: selection.stateCode, near: `${selection.lat},${selection.lon}`, limit: '24', kind: kind === 'All' ? undefined : kind } : {});

  // National monthly trend for the pipeline card when nothing is selected.
  const national = useApi('/registrations', selection || !win ? {} : { from: win.first, to: win.last, state: stateCode || undefined, category: category === 'All' ? undefined : category });
  const trendSeries = selection ? trend.data?.series : national.data?.series;
  const selectedEvLast12 = (trendSeries || []).slice(-12).reduce((a, o) => a + (o.total || 0), 0);

  // ---- heat points (EV density, weighted by EV stock) ----
  const evPoints = useMemo(() => {
    const rows = gap.data?.rows || [];
    const max = Math.max(...rows.map((r) => r.evs), 1);
    return rows.filter((r) => r.evs > 0).map((r) => [r.lat, r.lon, Math.min(1, r.evs / max)]);
  }, [gap.data]);

  const onGapSelect = useCallback((row) => {
    setPanelHide(false);
    if (dimension === 'state') {
      // Clicking a state filters down to it → district-level depth + camera fly.
      setStateCode(row.stateCode);
      setSelection({
        kind: 'State', name: row.state, stateCode: row.stateCode,
        districtId: undefined, lat: row.lat, lon: row.lon, gapRow: row,
      });
      return;
    }
    setSelection({
      kind: 'District', name: row.district, stateCode,
      districtId: row.districtId, lat: row.lat, lon: row.lon, gapRow: row,
    });
  }, [dimension, stateCode]);

  const camera = useMemo(() => {
    const st = STATES.find((s) => s.code === stateCode);
    return st ? { lat: st.lat, lon: st.lon, zoom: 6.4 } : null;
  }, [stateCode]);

  const top10 = (gap.data?.rows || []).slice(0, 10);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadInfo(null);
    try {
      const res = await apiUploadRegistrationCsv(file);
      setUploadInfo({ ok: true, text: `Loaded ${res.loaded} rows (${res.schema} schema, ${res.months?.length} months). ${res.skipped ? res.skipped + ' skipped.' : ''}` });
      meta.refetch();
    } catch (err) {
      setUploadInfo({ ok: false, text: err.message });
    } finally { setUploading(false); e.target.value = ''; }
  }

  const isLoading = gap.loading || meta.loading;
  const sliderMin = win ? monthShift(win.first, 23) : null; // full 24-m window available

  return (
    <div className="flex flex-col min-h-0 lg:h-[calc(100vh-56px)]">

      {/* ---- Filter bar ---- */}
      <div className="mx-auto w-full max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <Select label="State" value={stateCode || 'All'} onChange={(v) => { setStateCode(v === 'All' ? '' : v); setSelection(null); }}
            options={['All', ...STATES.map((s) => s.code)]} render={(o) => (o === 'All' ? 'All India' : `${o} — ${STATES.find((s) => s.code === o)?.name}`)} />
          <Select label="Vehicle type" value={category || 'All'} onChange={setCategory} options={VEHICLE_OPTIONS}
            render={(o) => (o === 'All' ? 'All vehicles' : CATEGORY_LABELS[o])} />
          <Select label="Charger type" value={kind || 'All'} onChange={setKind} options={KIND_OPTIONS}
            render={(o) => (o === 'All' ? 'AC + DC' : o === 'DC' ? 'DC fast' : 'AC')} />
          <p className="ml-auto max-w-xs text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Gap index compares EV stock (24 mo rolling) with public chargers·percentile-normalized across the current view.
          </p>
        </div>
      </div>

      {/* ---- Map + panel + ranking ---- */}
      <div className="relative mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-[1fr_360px] min-h-0">

        <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 shadow-card lg:min-h-0 dark:border-slate-800" ref={mapBoxRef}>
          {isLoading ? (
            <div className="grid h-full place-items-center"><Skeleton className="h-3/4 w-3/4" /></div>
          ) : gap.error ? (
            <div className="p-6"><ErrorNote error={gap.error} onRetry={gap.refetch} /></div>
          ) : (
            <MapCanvas
              dark={true}
              evPoints={layers.ev ? evPoints : null}
              gapRows={layers.gap ? gap.data?.rows : null}
              gapDimension={dimension}
              chargers={layers.chargers ? chargers.data?.items : null}
              camera={camera}
              onSelect={onGapSelect}
            />
          )}

          {/* layer toggles */}
          <div className="absolute left-2 top-2 z-[500] flex flex-col gap-1.5" role="group" aria-label="Map layers">
            <LayerToggle label="EV density heat" checked={layers.ev} onChange={(c) => setLayers((l) => ({ ...l, ev: c }))} />
            <LayerToggle label="Charging stations" checked={layers.chargers} onChange={(c) => setLayers((l) => ({ ...l, chargers: c }))} dot={['#43a8a6', '#d64545']} />
            <LayerToggle label="Charging gap" checked={layers.gap} onChange={(c) => setLayers((l) => ({ ...l, gap: c }))} dot={['#0d7d6c', '#d64545']} />
          </div>

          {/* legend: always visible */}
          <div className="absolute bottom-3 left-2 z-[500]">
            <GapLegend
              sub={dimension === 'district' ? `Districts of ${stateCode} · ${monthSafe}` : `States · ${monthSafe}`}
              extra={<p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Bubble size = EV stock</p>}
            />
          </div>

          {/* time slider */}
          <div className="absolute bottom-3 right-2 z-[500]">
            <TimeSlider min={sliderMin} max={win?.last} value={monthSafe || win?.last} onChange={(m) => setMonth(m)} />
          </div>
        </div>

        {/* ---- Side panel (becomes a bottom tab on small screens) ---- */}
        <aside className="flex max-h-[560px] flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:max-h-none dark:border-slate-800 dark:bg-slate-900">
          {panelHide ? (
            <button onClick={() => setPanelHide(false)} className="self-start rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-300">
              Show selection panel
            </button>
          ) : (
            <SidePanel
              kind={selection?.kind || 'Region'}
              name={selection?.name}
              gapRow={selection?.gapRow}
              meta={selection ? selectedEvLast12 : null}
              trend={trendSeries}
              chargers={nearChargers.data?.items}
              trendLoading={trend.loading}
              trendError={trend.error}
              chargersLoading={nearChargers.loading}
              chargersError={nearChargers.error}
              onClose={() => setPanelHide(true)}
              onRetryTrend={trend.refetch}
            />
          )}
        </aside>
      </div>

      {/* ---- Ranking + downloads ---- */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="Ranking table">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Top 10 most underserved {dimension === 'district' ? `districts in ${stateCode}` : 'states'} — {monthSafe}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCsv(gap.data?.rows || [], [
                    { key: dimension === 'district' ? 'district' : 'state', label: dimension },
                    { key: 'evs', label: 'EVs (24mo)' }, { key: 'chargers', label: 'Public chargers' },
                    { key: 'gapRaw', label: 'EVs per charger' }, { key: 'gapIndex', label: 'Gap index' },
                  ], `ev-gap-${dimension}-${stateCode || 'IN'}-${monthSafe}.csv`)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  ⬇ CSV
                </button>
                <button
                  onClick={() => downloadPng(mapBoxRef.current, `ev-gap-map-${monthSafe}.png`)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  ⬇ Map PNG
                </button>
              </div>
            </div>
            {gap.loading && <Skeleton className="h-48 w-full" />}
            {gap.error && <ErrorNote error={gap.error} onRetry={gap.refetch} />}
            {gap.data && (
              <ol className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {top10.map((r, i) => (
                  <li key={r.stateCode || r.districtId} className="flex items-center gap-3 py-2">
                    <span className="w-5 text-right text-xs tabular-nums text-slate-400">{i + 1}</span>
                    <span className="flex-1 truncate font-medium text-slate-800 dark:text-slate-100">{dimension === 'district' ? r.district : r.state}</span>
                    <span className="hidden text-xs text-slate-500 tabular-nums sm:inline dark:text-slate-400">{fmt(r.evs)} EVs · {fmt(r.chargers)} chargers · {fmtR(r.gapRaw)}/charger</span>
                    <button onClick={() => onGapSelect(r)} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: gapColor(r.gapIndex) }} aria-hidden />
                      <span className="w-8 text-right text-xs font-bold tabular-nums" style={{ color: gapColor(r.gapIndex) }}>{r.gapIndex}</span>
                    </button>
                  </li>
                ))}
                {!gap.data.rows.length && <li className="py-3 text-xs text-slate-500">No data for current filters.</li>}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="Data refresh and CSV upload">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Data pipeline</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Refresh runs daily (node-cron). Chargers: Open Charge Map · Registrations: Vahan via CSV upload / scheduled job.
              {' '}Last updated: {meta.data?.lastUpdated ? new Date(meta.data.lastUpdated).toLocaleString('en-IN') : '—'}
            </p>
            <label className="mt-3 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-xs hover:border-brand-400 dark:border-slate-600">
              <input type="file" accept=".csv" className="sr-only" onChange={handleUpload} disabled={uploading} />
              {uploading ? 'Uploading…' : <><strong className="text-brand-600 dark:text-brand-300">Upload Vahan CSV</strong><br />Accepted: canonical monthly aggregate, or per-vehicle export (like the bundled sample)</>}
            </label>
            {uploadInfo && (
              <p role="status" className={`mt-2 rounded-lg px-3 py-2 text-xs ${uploadInfo.ok ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'}`}>
                {uploadInfo.text}
              </p>
            )}
            <TrendChart series={trendSeries?.length ? trendSeries : null} height={170} title={`Trend — ${selection?.name || pickedLabel(stateCode)}`} />
          </section>
        </div>
      </div>
    </div>
  );
}

function pickedLabel(code) {
  const s = STATES.find((x) => x.code === code);
  return s ? s.name : 'India';
}
