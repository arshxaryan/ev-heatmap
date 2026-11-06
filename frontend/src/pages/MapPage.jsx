import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MapCanvas from '../map/MapCanvas.jsx';
import GapLegend from '../components/GapLegend.jsx';
import TimeSlider from '../components/TimeSlider.jsx';
import { Skeleton, ErrorNote } from '../components/Loaders.jsx';
import { Select, LayerToggle } from '../components/FilterBits.jsx';
import { useApi } from '../api/client.js';
import { CATEGORIES, CATEGORY_LABELS, monthShift } from '../utils';
import { STATES } from '../data/geo';

const VEHICLE_OPTIONS = ['All', ...CATEGORIES];
const KIND_OPTIONS = ['All', 'AC', 'DC'];

/**
 * /map — Heat map only.
 * Full-bleed map with layer toggles, legend, time slider and a real
 * fullscreen mode. Rankings / trend / data-pipeline live on /stats.
 */
export default function MapPage() {
  const meta = useApi('/meta');
  const win = meta.data?.window;
  const [stateCode, setStateCode] = useState('');
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState('');
  const [month, setMonth] = useState(null);
  const [layers, setLayers] = useState({ ev: true, gap: true, chargers: true });
  const shellRef = useRef(null);

  if (win && !month) setMonth(win.last);

  const dimension = stateCode ? 'district' : 'state';
  const monthSafe = month && win ? (month < monthShift(win.first, 23) ? monthShift(win.first, 23) : month) : null;

  const gap = useApi('/gap', {
    dimension, state: stateCode || undefined, category: category === 'All' ? undefined : category,
    kind: kind === 'All' ? undefined : kind, month: monthSafe,
  });
  const chargers = useApi('/chargers', {
    state: stateCode || undefined, kind: kind === 'All' ? undefined : kind, limit: '3000',
  });

  // ---- heat points (EV density, weighted by EV stock) ----
  const evPoints = useMemo(() => {
    const rows = gap.data?.rows || [];
    const max = Math.max(...rows.map((r) => r.evs), 1);
    return rows.filter((r) => r.evs > 0).map((r) => [r.lat, r.lon, Math.min(1, r.evs / max)]);
  }, [gap.data]);

  const onGapSelect = useCallback((row) => {
    if (dimension === 'state') setStateCode(row.stateCode); // drill into a state's districts
  }, [dimension]);

  const camera = useMemo(() => {
    const st = STATES.find((s) => s.code === stateCode);
    return st ? { lat: st.lat, lon: st.lon, zoom: 6.4 } : null;
  }, [stateCode]);

  const isLoading = gap.loading || meta.loading;
  const sliderMin = win ? monthShift(win.first, 23) : null;

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current?.requestFullscreen();
    } catch { /* ignore — some browsers block until user interaction */ }
  }

  const statsQuery = `${stateCode ? `state=${stateCode}` : ''}${category ? `&cat=${category}` : ''}${kind ? `&kind=${kind}` : ''}`;

  return (
    <div className="flex min-h-0 flex-col lg:h-[calc(100vh-56px)]">

      {/* ---- Filter bar ---- */}
      <div className="mx-auto w-full max-w-7xl shrink-0 px-4 py-3">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <Select label="State" value={stateCode || 'All'} onChange={(v) => setStateCode(v === 'All' ? '' : v)}
            options={['All', ...STATES.map((s) => s.code)]} render={(o) => (o === 'All' ? 'All India' : `${o} — ${STATES.find((s) => s.code === o)?.name}`)} />
          <Select label="Vehicle type" value={category || 'All'} onChange={setCategory} options={VEHICLE_OPTIONS}
            render={(o) => (o === 'All' ? 'All vehicles' : CATEGORY_LABELS[o])} />
          <Select label="Charger type" value={kind || 'All'} onChange={setKind} options={KIND_OPTIONS}
            render={(o) => (o === 'All' ? 'AC + DC' : o === 'DC' ? 'DC fast' : 'AC')} />
          <p className="ml-auto max-w-xs text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Gap index compares EV stock (24 mo rolling) with public chargers·percentile-normalized across the current view.
          </p>
          <Link
            to={`/stats${statsQuery ? '?' + statsQuery : ''}`}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            📊 Stats &amp; rankings →
          </Link>
        </div>
      </div>

      {/* ---- Map only, fills the rest of the screen ---- */}
      <div className="mx-auto w-full max-w-7xl min-h-0 flex-1 px-4 pb-4">
        <div
          className="map-shell relative h-[65vh] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 shadow-card lg:h-full dark:border-slate-800"
          ref={shellRef}
        >
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

          {/* fullscreen */}
          <div className="absolute right-2 top-2 z-[500]">
            <button
              onClick={toggleFullscreen}
              title="Toggle fullscreen (Esc to exit)"
              className="rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-card backdrop-blur hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ⛶ Full map
            </button>
          </div>

          {/* legend */}
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
      </div>
    </div>
  );
}
