import { AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CATEGORY_COLORS, CATEGORY_LABELS, CATEGORIES, monthLabel } from '../utils';

/** Monthly registration trend (stacked by vehicle category). series: [{month, '2W', '3W', ...}] */
export default function TrendChart({ series, height = 220, title }) {
  if (!series?.length) return null;
  return (
    <div style={{ width: '100%', height }}>
      {title && <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</p>}
      <ResponsiveContainer width="100%" height={height - (title ? 14 : 0)}>
        <AreaChart data={series} margin={{ top: 4, right: 6, left: -14, bottom: 0 }}>
          <defs>
            {CATEGORIES.map((c) => (
              <linearGradient key={c} id={`trend-${c}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CATEGORY_COLORS[c]} stopOpacity={0.75} />
                <stop offset="100%" stopColor={CATEGORY_COLORS[c]} stopOpacity={0.25} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(m) => monthLabel(m).replace(' ', " '")} />
          <YAxis tick={{ fontSize: 10 }} width={54} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <ReTooltip
            labelFormatter={(m) => monthLabel(m)}
            formatter={(v, name) => [new Intl.NumberFormat('en-IN').format(v), CATEGORY_LABELS[name] || name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => CATEGORY_LABELS[v] || v} />
          {CATEGORIES.map((c) => (
            <Area key={c} type="monotone" dataKey={c} stackId="1" stroke={CATEGORY_COLORS[c]} fill={`url(#trend-${c})`} strokeWidth={1.5} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
