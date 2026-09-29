import { memo } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Point } from '@/types/domain';
import { palette } from '@/constants/palette';

export const RouteMap = memo(function RouteMap({ points, height = 230,
  refreshToken, followCurrent = false }: {
    points: Point[]; height?: number; refreshToken?: number; followCurrent?: boolean;
  }) {
  void refreshToken;
  if (!points.length) return null;
  let minLat = Infinity; let maxLat = -Infinity; let minLon = Infinity; let maxLon = -Infinity;
  const visiblePoints = followCurrent ? points.slice(-1500) : points;
  const current = points[points.length - 1];
  if (followCurrent) {
    minLat = maxLat = current.latitude;
    minLon = maxLon = current.longitude;
  } else {
    for (const point of visiblePoints) {
      minLat = Math.min(minLat, point.latitude); maxLat = Math.max(maxLat, point.latitude);
      minLon = Math.min(minLon, point.longitude); maxLon = Math.max(maxLon, point.longitude);
    }
  }
  const stride = Math.max(1, Math.ceil(visiblePoints.length / 500));
  const sampled = visiblePoints.filter((_, index) => index % stride === 0 || index === visiblePoints.length - 1);
  const coords = sampled.map((point) => ({ latitude: point.latitude, longitude: point.longitude }));
  return <MapView
    style={{ height, width: '100%', borderRadius: 20 }}
    region={{
      latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2,
      latitudeDelta: followCurrent ? 0.008 : Math.max(0.008, (maxLat - minLat) * 1.5),
      longitudeDelta: followCurrent ? 0.008 : Math.max(0.008, (maxLon - minLon) * 1.5),
    }}
    scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}>
    {coords.length >= 2 ? <Polyline coordinates={coords} strokeColor={palette.accent} strokeWidth={5} /> : null}
    <Marker coordinate={coords[0]} pinColor={palette.cyan} title={followCurrent ? 'Parcours' : 'Départ'} />
    {coords.length >= 2 ? <Marker coordinate={coords[coords.length - 1]}
      pinColor={palette.orange} title={followCurrent ? 'Position actuelle' : 'Arrivée'} /> : null}
  </MapView>;
});
