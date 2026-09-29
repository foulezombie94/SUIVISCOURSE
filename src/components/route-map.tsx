import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Point } from '@/types/domain';
import { palette } from '@/constants/palette';

export function RouteMap({ points, height = 230 }: { points: Point[]; height?: number }) {
  if (!points.length) return null;
  let minLat = Infinity; let maxLat = -Infinity; let minLon = Infinity; let maxLon = -Infinity;
  for (const point of points) {
    minLat = Math.min(minLat, point.latitude); maxLat = Math.max(maxLat, point.latitude);
    minLon = Math.min(minLon, point.longitude); maxLon = Math.max(maxLon, point.longitude);
  }
  const stride = Math.max(1, Math.ceil(points.length / 500));
  const sampled = points.filter((_, index) => index % stride === 0 || index === points.length - 1);
  const coords = sampled.map((point) => ({ latitude: point.latitude, longitude: point.longitude }));
  return <MapView
    style={{ height, width: '100%', borderRadius: 20 }}
    region={{
      latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(0.008, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.008, (maxLon - minLon) * 1.5),
    }}
    scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}>
    {coords.length >= 2 ? <Polyline coordinates={coords} strokeColor={palette.accent} strokeWidth={5} /> : null}
    <Marker coordinate={coords[0]} pinColor={palette.cyan} title="Départ" />
    {coords.length >= 2 ? <Marker coordinate={coords[coords.length - 1]} pinColor={palette.orange} title="Arrivée" /> : null}
  </MapView>;
}
