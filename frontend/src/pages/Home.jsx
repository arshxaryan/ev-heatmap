import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../theme.jsx';
import { useApi } from '../api/client.js';
import { Skeleton, ErrorNote } from '../components/Loaders.jsx';
import MapCanvas from '../map/MapCanvas.jsx';
import GapLegend from '../components/GapLegend.jsx';
import { fmt, fmtR } from '../utils';
import { INDIA_CENTER } from '../data/geo.js';

/** Home: hero, headline stats, "Last updated", map preview heat of gap. */
export default function Home() {
  const { dark } = useTheme();
  const stats = useApi('/stats');
  const gap = useApi('/gap?dimension=state', {});

  // Heat preview — EV density by state.
  const evPoints = useMemo(() => {
    const rows = gap.data?.rows || [];
    const max = Math.max(...rows.map((r) => r.evs), 1);
    return rows.map((r) => [r.lat, r.lon, Math.min(1, r.evs / max)]);
  }, [gap.data]);

  const headline = [
    { key: 'evStock', label: 'EVs registered (24 mo)', value: fmt(stats.data?.evStock) },
    { key: 'chargers', label: 'Public chargers', value: fmt(stats.data?.chargers) },
    { key: 'ratio', label: 'National EVs / charger', value: fmtR(stats.data?.evsPerCharger) },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">Vahan registrations × public charging</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
            Where is India charging — and where is it falling behind?
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-50/90">
            EV Gap India overlays state- and district-level EV adoption against public charging station
            availability to expose the <strong className="text-white">charging gaps</strong> — regions with many
            EVs but too few public chargers. Built for policymakers, students, buyers and operators.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/map" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-800 shadow-card hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Open the live map →
            </Link>
            <Link to="/insights" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Key findings
            </Link>
          </div>
        </div>
      </section>

      {/* Headline stats */}
      <section className="mx-auto max-w-7xl px-4 py-10" aria-label="Headline statistics">
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.loading
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
            : stats.error ? <ErrorNote error={stats.error} onRetry={stats.refetch} /> : headline.map((h) => (
              <div key={h.key} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">{h.label}</p>
                <p className="mt-1 text-3xl font-black tabular-nums text-slate-900 dark:text-white">{h.value}</p>
                {h.key === 'ratio' && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">India average — the city-level gap is far wider</p>}
              </div>
            ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Last updated: {stats.data?.lastUpdated ? new Date(stats.data.lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '…'}
          {' '}· window {stats.data?.window?.first} → {stats.data?.window?.last}
        </p>
      </section>

      {/* Map preview */}
      <section className="mx-auto max-w-7xl px-4 pb-14" aria-label="Map preview">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">EV adoption heat — India</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Preview. The full dashboard has gap bubbles, chargers, filters and the time slider.</p>
          </div>
          <Link to="/map" className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">Explore</Link>
        </div>
        <div className="relative h-[380px] overflow-hidden rounded-2xl border border-slate-200 shadow-card sm:h-[480px]">
          {gap.error ? <div className="p-4"><ErrorNote error={gap.error} onRetry={gap.refetch} /></div>
            : evPoints.length ? (
              <MapCanvas dark={dark} evPoints={evPoints} interactive={false} className="rounded-2xl" />
            ) : <Skeleton className="h-full w-full" />}
          <div className="absolute bottom-3 left-3 z-[500]">
            <GapLegend title="EV registrations" sub="Heat = EV stock (Indicative preview)" />
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="mx-auto max-w-7xl px-4 pb-16" aria-label="Who is this for">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Policymakers', 'Target subsidy and infra programs to the districts with the worst gap index.'],
            ['Charging operators', 'Find demand-rich, charger-poor clusters for the next charging hub.'],
            ['Students & researchers', 'Clean, documented data with sources and a transparent methodology.'],
            ['EV buyers', 'Check how public charging is served in the places you live and travel.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-900 dark:text-white">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
