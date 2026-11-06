/** Small shared form bits for the Heat Map and Stats pages. */
export function Select({ label, value, onChange, options, render = (o) => o, disabled = false }) {
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

/** Layer checkbox chip (map overlays). */
export function LayerToggle({ checked, onChange, label, dot }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs shadow-card backdrop-blur focus-within:ring-2 focus-within:ring-brand-300 dark:border-slate-700 dark:bg-slate-900/90">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-brand-500" />
      <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {dot && <span className="h-3 w-6 rounded-full" style={{ background: `linear-gradient(to right, ${dot[0]}, ${dot[1]})` }} aria-hidden />}
    </label>
  );
}
