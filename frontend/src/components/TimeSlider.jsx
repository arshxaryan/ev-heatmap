import { useEffect, useState } from 'react';
import { monthLabel, monthShift } from '../utils';

/** Number of months between two "YYYY-MM" values (b − a). */
function monthsBetween(a, b) {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return by * 12 + bm - (ay * 12 + am);
}

/**
 * Time slider + play button animating EV growth across months.
 * Fully controlled: value = "YYYY-MM", onChange(month) fires on user input.
 */
export default function TimeSlider({ min, max, value, onChange }) {
  const [playing, setPlaying] = useState(false);
  const stepCount = min && max ? monthsBetween(min, max) : 0;
  const curStep = stepCount ? Math.max(0, monthsBetween(min, value)) : 0;

  useEffect(() => {
    if (!playing || stepCount === 0) return undefined;
    const next = monthShift(min, Math.min(stepCount, monthsBetween(min, value) + 1));
    if (monthsBetween(min, next) > stepCount) { setPlaying(false); return undefined; }
    const id = setTimeout(() => onChange(next), 700);
    return () => clearTimeout(id);
  }, [playing, value, min, max, stepCount]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStep(n) {
    if (n > stepCount) { setPlaying(false); onChange(max); return; }
    onChange(monthShift(min, n));
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-card backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <button
        onClick={() => { if (monthsBetween(min, value) >= stepCount) onChange(min); setPlaying((p) => !p); }}
        aria-label={playing ? 'Pause time animation' : 'Play time animation'}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        {playing ? '⏸' : '▶'}
      </button>
      <input
        type="range"
        min={0}
        max={stepCount}
        step={1}
        value={curStep}
        aria-label="Timeline month"
        className="h-1.5 w-36 accent-brand-500 sm:w-56"
        onChange={(e) => handleStep(Number(e.target.value))}
      />
      <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">
        {monthLabel(value)}
      </span>
    </div>
  );
}
