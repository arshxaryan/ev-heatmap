import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LabelList,
} from 'recharts';
import { useApi } from '../api/client.js';
import { Skeleton, SkeletonText, ErrorNote } from '../components/Loaders.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, fmt, fmtR, monthLabel } from '../utils';

const AXIS = { fontSize: 11, fill: 'currentColor' };

export default function Insights() {
  const national = useApi('/stats');
  const gap = useApi('/gap?dimension=state', {});

  const rows = gap.data?.rows || [];
  const worst = rows.slice(0, 10);
  const best = [...rows].sort((a, b) => a.gapIndex - b.gapIndex).slice(0, 6);

  const worstChart = useMemo(() => worst.map((r) => ({
    name: r.state.length > 14 ? r.state.slice(0, 13) + '…' : r.state,
    ratio: r.gapRaw === Infinity ? null : r.gapRaw,
    gapIndex: r.gapIndex,
  })), [rows]);

  const mix = useMemo(() => {
    const b = national.data?.byCategory || {};
    return CATEGORIES.map((c) => ({ name: CATEGORY_LABELS[c], key: c, value: b[c] || 0 })).filter((d) => d.value > 0);
  }, [national.data]);

  const chargerMix = national.data?.chargerMix || [];

  // Key findings
  const findings = useMemo(() => {
    if (!rows.length || !national.data) return [];
    const w = rows.find((r) => r.gapIndex === Math.max(...rows.map((x) => x.gapIndex)));
    const served = rows.find((r) => r.gapIndex === Math.min(...rows.map((x) => x.gapIndex)));
    const worstList = rows.filter((r) => r.gapIndex >= 66).map((r) => r.state);
    const out = [];
    out.push(`Nationally, there is 1 public charger for every ${fmtR(national.data.evsPerCharger, 0)} EVs in the 24-month window.`);
    out.push(`${worstList.length} states/UTs sit in the top third of the gap index — the most underserved is ${w?.state} (${fmt(w?.evs)} EVs vs ${fmt(w?.chargers)} chargers).`);
    out.push(`${served?.state} is the best served (gap index ${served?.gapIndex}): ${fmt(served?.evs)} EVs share ${fmt(served?.chargers)} chargers.`);
    out.push(`About ${(((mix.find((m) => m.key === '2W')?.value || 0) / Math.max(national.data.evLast12Months, 1)) * 100).toFixed(1)}% of new EV registrations in the last 12 months were 2-wheelers.`);
    out.push(`Note: counts reflect sampled/simulated data where official feeds are unavailable — treat absolute numbers as indicative, ranking as directional (see Methodology).`);
    return out;
  }, [rows, national.data, mix]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">Insights & Key findings</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
        Charts and ranked findings derived from the same dataset as the map. Gap index is percentile-normalized
        across the 36 states/UTs — ratios (EVs per charger) carry the absolute meaning.
      </p>

      {/* Key findings */}
      <section aria-label="Key findings" className="mt-6 grid gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Key findings</h2>
        {national.loading || gap.loading ? <SkeletonText lines={4} /> : (
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {findings.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* National trend */}
        <NationalCard />

        {/* EV mix + charger mix */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="Vehicle mix">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">EV mix — last 12 months</h2>
          {national.loading ? <Skeleton className="h-56" /> : national.error ? <ErrorNote error={national.error} onRetry={national.refetch} /> : (
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} strokeWidth={0}>
                    {mix.map((d) => <Cell key={d.key} fill={CATEGORY_COLORS[d.key]} />)}
                  </Pie>
                  <ReTooltip formatter={(v) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
            {chargerMix.map((c) => (
              <span key={c.kind}>{c.kind === 'DC' ? 'DC fast' : 'AC'} chargers: <strong className="text-slate-700 dark:text-slate-200">{fmt(c.c)}</strong></span>
            ))}
          </div>
        </section>

        {/* Worst 10 bar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="Underserved states">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Most underserved states — EVs per public charger</h2>
          {gap.loading ? <Skeleton className="h-72" /> : gap.error ? <ErrorNote error={gap.error} onRetry={gap.refetch} /> : (
            <div className="mt-2 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={worstChart} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" horizontal={false} />
                  <XAxis type="number" tick={AXIS} />
                  <YAxis type="category" dataKey="name" width={110} tick={AXIS} />
                  <ReTooltip formatter={(v, n) => [fmtR(v), n === 'ratio' ? 'EVs/charger' : n]} />
                  <Bar dataKey="ratio" fill="#d64545" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="ratio" position="right" formatter={(v) => (v == null ? '—' : Math.round(v))} style={{ fontSize: 10, fill: 'currentColor' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Best served + top list */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="Best served">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Best served states (reference benchmark)</h2>
          <ol className="mt-2 space-y-1.5 text-sm">
            {gap.loading && <SkeletonText lines={5} />}
            {best.map((r) => (
              <li key={r.stateCode} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <span className="font-medium text-slate-800 dark:text-slate-100">{r.state}</span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">{fmtR(r.gapRaw)} EVs/charger · index {r.gapIndex}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function NationalCard() {
  const reg = useApi('/registrations', { from: '2022-04' });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="National trend">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">National EV registrations per month</h2>
      {reg.loading ? <Skeleton className="h-72" /> : reg.error ? <ErrorNote error={reg.error} onRetry={reg.refetch} /> : (
        <div className="mt-2">
          <TrendChart series={reg.data?.series} height={260} />
          {reg.data?.series?.length > 0 && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {monthLabel(reg.data.series[0].month)} → {monthLabel(reg.data.series[reg.data.series.length - 1].month)} · stacked by vehicle category
            </p>
          )}
        </div>
      )}
    </section>
  );
}
