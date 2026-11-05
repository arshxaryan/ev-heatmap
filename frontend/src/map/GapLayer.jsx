import { CircleMarker, Tooltip } from 'react-leaflet';
import { gapColor, fmt, fmtR } from '../utils';

/**
 * Gap/bubble layer: one circle per state/district.
 * radius ∝ √EV stock, color = Gap Index (cb-safe scale), click → side panel.
 * rows: from /api/gap (keys differ by dimension: state | district).
 */
export function GapLayer({ rows, dimension, onSelect }) {
  if (!rows?.length) return null;
  const maxEvs = Math.max(...rows.map((r) => r.evs), 1);
  return rows.map((r) => {
    const name = dimension === 'district' ? r.district : r.state;
    const radius = 6 + 26 * Math.sqrt(r.evs / maxEvs);
    return (
      <CircleMarker
        key={name}
        center={[r.lat, r.lon]}
        radius={radius}
        pathOptions={{
          color: '#0f172a55',
          weight: 1,
          fillColor: gapColor(r.gapIndex),
          fillOpacity: 0.72,
        }}
        eventHandlers={{ click: () => onSelect?.(r) }}
      >
        <Tooltip direction="top" opacity={1}>
          <strong>{name}</strong><br />
          EVs: {fmt(r.evs)} · Chargers: {fmt(r.chargers)}<br />
          EVs/charger: {fmtR(r.gapRaw)} · Gap index: {r.gapIndex}
        </Tooltip>
      </CircleMarker>
    );
  });
}
