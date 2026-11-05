/**
 * Shared helpers: month math/labels, colorblind-safe gap color scale,
 * CSV export and PNG export.
 */

// ---- month helpers ("YYYY-MM") ---------------------------------------------
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(m) {
  if (!m || !/^\d{4}-\d{2}$/.test(m)) return String(m ?? '');
  const [, mm] = m.split('-').map(Number);
  return `${MONTH_LABELS[mm - 1]} ${m.slice(0, 4)}`;
}

export function monthShift(m, k) {
  const [y, mo] = m.split('-').map(Number);
  const out = y * 12 + mo - 1 + k;
  return `${Math.floor(out / 12)}-${String((out % 12) + 1).padStart(2, '0')}`;
}

export function monthsRange(first, last) {
  const out = [];
  let cur = first;
  while (cur <= last) { out.push(cur); cur = monthShift(cur, 1); }
  return out;
}

// ---- colorblind-safe gap scale ---------------------------------------------
// Teal (well served) → sand → orange → red (severe gap).
// Chosen to avoid classic red/green confusion; matches Methodology notes.
export const GAP_GRADIENT = {
  0.0: '#0d7d6c',
  0.25: '#43a8a6',
  0.5: '#e9c46a',
  0.75: '#ee8354',
  1.0: '#d64545',
};

function hexToRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function mix(a, b, t) {
  const [r1, g1, b1] = a, [r2, g2, b2] = b;
  const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}

export function gapColor(index /* 0–100 */) {
  const t = Math.max(0, Math.min(1, (index ?? 50) / 100));
  const stops = Object.entries(GAP_GRADIENT).map(([k, v]) => [Number(k), hexToRgb(v)]);
  for (let i = 0; i < stops.length - 1; i++) {
    const [p1, c1] = stops[i], [p2, c2] = stops[i + 1];
    if (t >= p1 && t <= p2) return mix(c1, c2, p2 === p1 ? 0 : (t - p1) / (p2 - p1));
  }
  return 'grey';
}

/** Heat gradient for the EV-density layer (dark → warm white), CB-safe. */
export const EV_HEAT_GRADIENT = { 0.2: '#1e3e41', 0.4: '#2f8c8c', 0.6: '#e9c46a', 0.8: '#ee8354', 1: '#d64545' };

export const CATEGORY_COLORS = { '2W': '#43a8a6', '3W': '#e9c46a', '4W': '#ee8354', BUS: '#7a8ba0' };
export const CATEGORIES = ['2W', '3W', '4W', 'BUS'];
export const CATEGORY_LABELS = { '2W': '2-Wheeler', '3W': '3-Wheeler', '4W': '4-Wheeler', BUS: 'Bus' };

// ---- exports ----------------------------------------------------------------
export function downloadCsv(rows, columns, filename) {
  const csv = [
    columns.map((c) => c.label).join(','),
    ...rows.map((r) => columns.map((c) => {
      const v = r[c.key];
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadPng(node, filename) {
  return import('html-to-image').then(({ toPng }) => toPng(node, { cacheBust: true, pixelRatio: 2 })
    .then((dataUrl) => {
      const a = document.createElement('a');
      a.href = dataUrl; a.download = filename; a.click();
    }));
}

export const nf = new Intl.NumberFormat('en-IN');
export const fmt = (n) => (n == null ? '—' : nf.format(Math.round(n)));
export const fmtR = (n, d = 1) => (n == null || !Number.isFinite(n) ? '∞' : n.toFixed(d));
