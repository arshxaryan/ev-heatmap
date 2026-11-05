import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { INDIA_CENTER } from '../data/geo';

/** Smoothly moves the camera when `target` (={lat,lon,zoom}) changes; null resets to India view. */
export default function CameraTarget({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lon], target.zoom ?? 7, { duration: 0.8 });
  }, [map, target?.lat, target?.lon, target?.zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  void INDIA_CENTER;
  return null;
}
