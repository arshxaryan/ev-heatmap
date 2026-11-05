import { Skeleton, SkeletonText, ErrorNote } from './Loaders';
import { fmt, fmtR, gapColor } from '../utils';
import TrendChart from './TrendChart';

function StatBox({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

/**
 * Selection side panel: totals, ratio, gap pill, monthly trend + nearest chargers.
 */
export default function SidePanel({ kind, name, meta, gapRow, trend, chargers, trendLoading, trendError, chargersLoading, chargersError, onClose, onRetryTrend }) {
  if (!name) {
    return (
      <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-200">Nothing selected yet</p>
        <p className="mt-1">Tap a state or district bubble on the map to see its EV ↔ charger balance.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-brand-600 dark:text-brand-300">{kind}</p>
          <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">{name}</h2>
        </div>
        <button onClick={onClose} aria-label="Close panel" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">✕</button>
      </div>

      {gapRow ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
              style={{ background: gapColor(gapRow.gapIndex) }}
            >
              Gap index {gapRow.gapIndex}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {gapRow.gapIndex >= 66 ? 'Severe gap' : gapRow.gapIndex >= 33 ? 'Moderate' : 'Well served'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="EVs (24 mo)" value={fmt(gapRow.evs)} />
            <StatBox label="Public chargers" value={fmt(gapRow.chargers)} />
            <StatBox label="EVs per charger" value={fmtR(gapRow.gapRaw)} hint="lower is better" />
            {meta && <StatBox label="EVs last 12 mo" value={fmt(meta)} />}
          </div>
        </div>
      ) : (
        <div className="mt-4"><Skeleton className="h-28 w-full" /></div>
      )}

      <div className="mt-4">
        {trendLoading && <SkeletonText lines={4} />}
        {trendError && <ErrorNote error={trendError} onRetry={onRetryTrend} />}
        {trend?.length > 0 && <TrendChart series={trend} title="Registrations per month" height={210} />}
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Nearest charging stations</p>
        {chargersLoading && <SkeletonText lines={3} />}
        {chargersError && <ErrorNote error={chargersError} />}
        {chargers?.length > 0 && (
          <ul className="space-y-1.5 text-xs">
            {chargers.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/70">
                <span className="truncate">
                  <span className={`mr-1 inline-block h-2 w-2 rounded-full ${c.kind === 'DC' ? 'bg-rose-500' : 'bg-teal-500'}`} aria-hidden />
                  {c.name}
                </span>
                {c.distanceKm != null && <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{c.distanceKm} km</span>}
              </li>
            ))}
          </ul>
        )}
        {!chargersLoading && !chargersError && (!chargers || chargers.length === 0) && (
          <p className="text-xs text-slate-500 dark:text-slate-400">No charger records for this area yet.</p>
        )}
      </div>
    </div>
  );
}
