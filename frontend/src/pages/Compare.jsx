import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useApi } from '../api/client.js';
import { STATES } from '../data/geo.js';
import { Skeleton, ErrorNote, SkeletonText } from '../components/Loaders.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { fmt, fmtR, gapColor } from '../utils';

/** Side-by-side state comparison. */
export default function Compare() {
  const [left, setLeft] = useState('MH');
  const [right, setRight] = useState('KA');
  const uniq = [...new Set([left, right])];

  const gapState = useApi('/gap?dimension=state', {});
  const lMeta = STATES.find((s) => s.code === left);
  const rMeta = STATES.find((s) => s.code === right);

  const getRow = (code) => (gapState.data?.rows || []).find((r) => r.stateCode === code);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Compare two states</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">EV adoption vs charger availability, side by side.</p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <StateSelect label="State A" value={left} onChange={setLeft} exclude={[]} />
        <StateSelect label="State B" value={right} onChange={setRight} exclude={[]} />
      </div>

      {gapState.error && <div className="mt-4"><ErrorNote error={gapState.error} onRetry={gapState.refetch} /></div>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <StateCard code={left} meta={lMeta} row={getRow(left)} loading={gapState.loading} />
        <StateCard code={right} meta={rMeta} row={getRow(right)} loading={gapState.loading} />
      </div>

      <CombinedTrend uniq={uniq} />
    </div>
  );
}

function StateSelect({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 dark:border-slate-600 dark:bg-slate-800"
      >
        {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>
    </label>
  );
}

function StateCard({ code, meta, row, loading }) {
  if (loading || !row) return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900"><Skeleton className="h-40" /></div>;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-brand-600 dark:text-brand-300">{meta?.type === 'ut' ? 'UT' : 'State'} · {code}</p>
          <h2 className="text-lg font-bold">{meta?.name}</h2>
        </div>
        <span className="rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: gapColor(row.gapIndex) }}>
          Gap index {row.gapIndex}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[['EVs (24 mo)', fmt(row.evs)], ['Chargers', fmt(row.chargers)], ['EVs/charger', fmtR(row.gapRaw)]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">
            <dt className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</dt>
            <dd className="text-sm font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {row.gapIndex >= 66 && <p className="mt-3 text-xs text-rose-600 dark:text-rose-300">⚠ Severe gap — public charging is far behind EV growth.</p>}
      {row.gapIndex < 33 && <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">✔ Relatively well served — reference benchmark.</p>}
    </div>
  );
}

/** Overlaid monthly trend of the two states + share-of-national metric. */
function CombinedTrend({ uniq }) {
  const [a, b] = uniq;
  const metaHook = useApi('/meta', {});
  const regA = useApi('/registrations', { state: a, from: undefined });
  const regB = useApi('/registrations', { state: b, from: undefined });
  const full = useApi('/registrations', { from: undefined });

  const merged = useMemo(() => {
    const mk = (series, tag) => new Map((series || []).map((o) => [o.month, o.total]));
    const ma = mk(regA.data?.series), mb = mk(regB.data?.series);
    const months = Array.from(new Set([...ma.keys(), ...mb.keys()])).sort();
    return months.map((m) => ({ month: m, [a]: ma.get(m) || 0, [b]: mb.get(m) || 0 }));
  }, [regA.data, regB.data, a, b]);

  // Share of national = last-12-month total regA vs national total.
  const last12 = (series) => (series || []).slice(-12).reduce((s, o) => s + (o.total || 0), 0);
  const shareA = full.data?.series ? last12(regA.data?.series) / Math.max(last12(full.data.series), 1) * 100 : null;
  const shareB = full.data?.series ? last12(regB.data?.series) / Math.max(last12(full.data.series), 1) * 100 : null;

  void metaHook;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="Trend comparison">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Monthly registrations — {a} vs {b}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {shareA != null && <>12-mo share of national: {a} {shareA.toFixed(1)}% · {b} {shareB.toFixed(1)}%</>}
        </p>
      </div>
      {(regA.loading || regB.loading) && <div className="mt-3"><SkeletonText lines={3} /></div>}
      {(regA.error || regB.error) && <div className="mt-3">{String((regA.error || regB.error).message)}</div>}
      {merged.length > 0 && (
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={merged.slice(-18)} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'currentColor' }} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: 'currentColor' }} width={54} />
              <ReTooltip formatter={(v) => new Intl.NumberFormat('en-IN').format(v)} />
              <Legend />
              <Bar dataKey={a} fill="#43a8a6" name={a} radius={[3, 3, 0, 0]} />
              <Bar dataKey={b} fill="#ee8354" name={b} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <CompactSeries code={a} />
      <CompactSeries code={b} />
    </section>
  );
}

function CompactSeries({ code }) {
  const reg = useApi('/registrations', { state: code, from: undefined });
  if (reg.loading) return <div className="mt-3"><Skeleton className="h-24" /></div>;
  if (!reg.data?.series?.length) return null;
  return (
    <div className="mt-3">
      <TrendChart series={reg.data.series} height={180} title={`${code} — stacked by vehicle category`} />
    </div>
  );
}
