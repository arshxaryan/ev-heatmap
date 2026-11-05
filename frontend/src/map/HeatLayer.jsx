import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { useMap } from 'react-leaflet';

/**
 * Heat layer (leaflet.heat) for point clouds.
 * points: [[lat, lon, weight], ...] — weights pre-normalized 0..1.
 * Rebuilds when props change; removed on unmount. Lazy: only mounted when active.
 */
export default function HeatLayer({ points, radius = 26, maxZoom = 7, minOpacity = 0.2, gradient }) {
  const map = useMap();
  const key = JSON.stringify(points);

  useEffect(() => {
    if (!points?.length) return undefined;
    const layer = L.heatLayer(points, {
      radius,
      blur: Math.round(radius * 0.75),
      maxZoom,
      minOpacity,
      gradient: gradient || undefined,
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, key, radius, maxZoom, minOpacity]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
