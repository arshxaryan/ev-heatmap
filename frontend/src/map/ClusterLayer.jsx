import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useMap } from 'react-leaflet';

/**
 * Clustered charging-station markers (leaflet.markercluster).
 * items: [{lat, lon, name, operator, kind, kw, connector}]
 */
export default function ClusterLayer({ items }) {
  const map = useMap();
  const key = JSON.stringify(items?.length) + (items?.[0]?.id ?? '') + (items?.slice(-1)[0]?.id ?? '');

  useEffect(() => {
    if (!items?.length) return undefined;
    const group = L.markerClusterGroup({
      maxClusterRadius: 38,
      showCoverageOnHover: false,
      chunkedLoading: true,
    });
    for (const it of items) {
      const m = L.circleMarker([it.lat, it.lon], {
        radius: 5, weight: 1.5,
        color: '#0f172a', fillColor: it.kind === 'DC' ? '#d64545' : '#43a8a6', fillOpacity: 0.9,
      });
      m.bindPopup(
        `<strong>${it.name}</strong><br/>${it.operator}<br/>${it.kind} · ${it.kw} kW<br/><small>${it.connector}</small>`,
        { autoPanPadding: [20, 20] }
      );
      group.addLayer(m);
    }
    map.addLayer(group);
    return () => { map.removeLayer(group); };
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
