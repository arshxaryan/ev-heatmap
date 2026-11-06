import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SidePanel from '../components/SidePanel.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { Skeleton, ErrorNote } from '../components/Loaders.jsx';
import { Select } from '../components/FilterBits.jsx';
import { useApi, apiUploadRegistrationCsv } from '../api/client.js';
import { CATEGORIES, CATEGORY_LABELS, downloadCsv, fmt, fmtR, gapColor, monthShift } from '../utils';
import { STATES } from '../data/geo';

const VEHICLE_OPTIONS = ['All', ...CATEGORIES];
const KIND_OPTIONS = ['All', 'AC', 'DC'];
const TOP_N = 10;

/**
 * /stats — Numbers page: rankings, region breakdown, trend and data pipeline.
 * The fullscreen heat map lives on /map.
 */
export default function StatsPage() {
  const meta = useApi('/meta');
  const win = meta.data?.window;
  const [params] = useSearchParams();

  const [stateCode, setStateCode] = useState(params.get('state') || '');
  const [category, setCategory] = useState(params.get('cat') || '');
  const [kind, setKind] = useState(params.get('kind') || '');
  const [month, setMonth] = useState(null);
  const [selRow, setSelRow] = useState(null);
  const [uploadInfo, setUploadInfo] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (win && !month) setMonth(win.last);

  const dimension = stateCode ? 'district' : 'state';
  const monthSafe = month && win ? (month < monthShift(win.first, 23) ? monthShift(win.first, 23) : month) : null;

  const gap = useApi('/gap', {
    dimension, state: stateCode || undefined, category: category === 'All' ? undefined : category,
    kind: kind === 'All' ? undefined : kind, month: monthSafe,
  });

  const rows = gap.data?.rows || [];
  const top10 = rows.slice(0, TOP_N);

  // Auto-select the worst region once data arrives (click any row to change).
  useEffect(() => {
    if (!selRow && rows.length) setSelRow(rows[0]);
  }, [rows.length, selRow, rows]);

  // Reset selection when the dimension changes so a district row doesn't linger.
  useEffect(() => { setSelRow(null); }, [dimension, stateCode]);

  const selCode = selRow?.stateCode || stateCode || undefined;
  const selIsDistrict = Boolean(selRow?.districtId);

  const trend = useApi('/trend', selRow ? { state: selCode, districtId: selIsDistrict ? selRow.districtId : undefined } : {});
  const nearChargers = useApi('/chargers', selRow
    ? { state: selCode, near: `${selRow.lat},${selRow.lon}`, limit: '24', kind: kind === 'All' ? undefined : kind } : {});

  // National / state monthly trend for the pipeline card when nothing is selected.
  const national = useApi('/registrations', selRow || !win ? {} : { from: win.first, to: win.last, state: stateCode || undefined, category: category === 'All' ? undefined : category });
  const trendSeries = selRow ? trend.data?.series : national.data?.series;
  const selectedEvLast12 = (trendSeries || []).slice(-12).reduce((a, o) => a + (o.total || 0), 0);

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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">

      {/* ---- Filter bar ---- */}
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
        <Link to={`/map${stateCode ? `?state=${stateCode}` : ''}`} className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
          🗺️ Open heat map →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ---- Rankings ---- */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="Ranking table">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Top {TOP_N} most underserved {dimension === 'district' ? `districts in ${STATES.find((s) => s.code === stateCode)?.name || stateCode}` : 'states'} — {monthSafe}
            </h2>
            <button
              onClick={() => downloadCsv(rows, [
                { key: dimension === 'district' ? 'district' : 'state', label: dimension },
                { key: 'evs', label: 'EVs (24mo)' }, { key: 'chargers', label: 'Public chargers' },
                { key: 'gapRaw', label: 'EVs per charger' }, { key: 'gapIndex', label: 'Gap index' },
              ], `ev-gap-${dimension}-${stateCode || 'IN'}-${monthSafe}.csv`)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              ⬇ CSV
            </button>
          </div>
          {gap.loading && <Skeleton className="h-48 w-full" />}
          {gap.error && <ErrorNote error={gap.error} onRetry={gap.refetch} />}
          {gap.data && (
            <ol className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {top10.map((r, i) => (
                <li key={r.stateCode || r.districtId}>
                  <button
                    onClick={() => setSelRow(r)}
                    className={`flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 ${selRow && (selRow.stateCode || selRow.districtId) === (r.stateCode || r.districtId) ? 'rounded-lg bg-brand-50 dark:bg-slate-800' : ''}`}
                  >
                    <span className="w-5 text-right text-xs tabular-nums text-slate-400">{i + 1}</span>
                    <span className="flex-1 truncate font-medium text-slate-800 dark:text-slate-100">{dimension === 'district' ? r.district : r.state}</span>
                    <span className="hidden text-xs text-slate-500 tabular-nums sm:inline dark:text-slate-400">{fmt(r.evs)} EVs · {fmt(r.chargers)} chargers · {fmtR(r.gapRaw)}/charger</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: gapColor(r.gapIndex) }} aria-hidden />
                      <span className="w-8 text-right text-xs font-bold tabular-nums" style={{ color: gapColor(r.gapIndex) }}>{r.gapIndex}</span>
                    </span>
                  </button>
                </li>
              ))}
              {!rows.length && <li className="py-3 text-xs text-slate-500">No data for current filters.</li>}
            </ol>
          )}
        </section>

        {/* ---- Data pipeline ---- */}
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
          <TrendChart
            series={trendSeries?.length ? trendSeries : null}
            height={170}
            title={`Trend — ${selRow ? (selIsDistrict ? selRow.district : selRow.state) : pickedLabel(stateCode)}`}
          />
        </section>
      </div>

      {/* ---- Region breakdown for the selected row ---- */}
      <div className="mt-4">
        {selRow ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <SidePanel
              kind={selIsDistrict ? 'District' : 'State'}
              name={selIsDistrict ? selRow.district : selRow.state}
              gapRow={selRow}
              meta={selectedEvLast12}
              trend={trendSeries}
              chargers={nearChargers.data?.items}
              trendLoading={trend.loading}
              trendError={trend.error}
              chargersLoading={nearChargers.loading}
              chargersError={nearChargers.error}
              onRetryTrend={trend.refetch}
            />
          </div>
        ) : gap.loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Select a state or district above to see its EV ↔ charger balance.</p>
        )}
      </div>
    </div>
  );
}

function pickedLabel(code) {
  const s = STATES.find((x) => x.code === code);
  return s ? s.name : 'India';
}
