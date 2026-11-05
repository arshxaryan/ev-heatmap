import { GAP_GRADIENT } from '../utils';

/**
 * Always-visible legend for the Gap Index scale + contextual swatches.
 * colorblind-safe: teal → sand → orange → red.
 */
export default function GapLegend({ title = 'Charging Gap Index', sub, extra }) {
  return (
    <div className="pointer-events-auto w-64 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-card backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {sub && <p className="mt-0.5 text-slate-500 dark:text-slate-400">{sub}</p>}
      <div
        className="mt-2 h-2.5 w-full rounded-full border border-slate-200 dark:border-slate-600"
        style={{ background: `linear-gradient(to right, ${GAP_GRADIENT[0]}, ${GAP_GRADIENT[0.25]}, ${GAP_GRADIENT[0.5]}, ${GAP_GRADIENT[0.75]}, ${GAP_GRADIENT[1]})` }}
      />
      <div className="mt-1 flex justify-between text-slate-500 dark:text-slate-400">
        <span>Well served</span>
        <span>Severe gap</span>
      </div>
      {extra}
    </div>
  );
}
