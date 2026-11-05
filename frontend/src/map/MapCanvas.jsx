import { MapContainer, TileLayer, ZoomControl, ScaleControl } from 'react-leaflet';
import HeatLayer from './HeatLayer';
import ClusterLayer from './ClusterLayer';
import { GapLayer } from './GapLayer.jsx';
import CameraTarget from './CameraTarget.jsx';
import { EV_HEAT_GRADIENT, GAP_GRADIENT } from '../utils';
import { INDIA_CENTER } from '../data/geo';

const TILES = {
  // OpenStreetMap raster tiles — no API key required.
  // Dark mode uses the same tiles inverted via CSS (see styles.css).
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors';

/**
 * MapCanvas — the one Leaflet map used everywhere (Home preview & dashboard).
 * Lazy loading: heat/cluster/gap layers only mount when their toggle is on.
 *
 * props:
 *  dark          boolean tile theme
 *  evPoints      [[lat,lon,w0to1]]  EV density heat
 *  gapRows       /api/gap rows      gap bubbles
 *  gapDimension  'state'|'district'
 *  chargers      [{lat,lon,...}]    cluster markers
 *  camera        {lat,lon,zoom}|null
 *  onSelect      (row) => void      gap bubble click
 *  interactive   bool (Home preview passes false)
 */
export default function MapCanvas({
  dark, evPoints = null, gapRows = null, gapDimension = 'state', chargers = null,
  camera = null, onSelect = () => {}, interactive = true, className = '',
}) {
  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={5}
      minZoom={4}
      maxZoom={13}
      zoomControl={false}
      scrollWheelZoom={interactive}
      dragging={interactive}
      className={`h-full w-full ${className}`}
      style={{ borderRadius: 'inherit' }}
    >
      <TileLayer url={TILES.url} attribution={ATTR} />
      <ZoomControl position="bottomright" />
      <ScaleControl position="bottomleft" metric imperial={false} />
      <CameraTarget target={camera} />

      {evPoints?.length > 0 && (
        <HeatLayer points={evPoints} gradient={EV_HEAT_GRADIENT} />
      )}

      {chargers?.length > 0 && <ClusterLayer items={chargers} />}

      {gapRows?.length > 0 && (
        <GapLayer rows={gapRows} dimension={gapDimension} onSelect={onSelect} />
      )}
    </MapContainer>
  );
}

export { GAP_GRADIENT };
