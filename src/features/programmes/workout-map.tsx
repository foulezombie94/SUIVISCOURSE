import { memo, useEffect, useRef } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Point } from '@/types/domain';

export const WorkoutMap = memo(function WorkoutMap({ points, observation, following, onPan }: {
  points: Point[]; observation: number; following: boolean; onPan: () => void;
}) {
  const map = useRef<MapView>(null);
  const current = points.at(-1);
  const latitude = current?.latitude;
  const longitude = current?.longitude;
  useEffect(() => {
    if (following && latitude != null && longitude != null) {
      map.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 700);
    }
  }, [latitude, longitude, observation, following]);
  if (!current) return null;
  const stride = Math.max(1, Math.ceil(points.length / 600));
  const coordinates = points.filter((_, index) => index % stride === 0 || index === points.length - 1)
    .map((point) => ({ latitude: point.latitude, longitude: point.longitude }));
  return <MapView ref={map} style={{ flex: 1 }} userInterfaceStyle="dark" onPanDrag={onPan} onTouchStart={onPan}
    initialRegion={{ latitude: current.latitude, longitude: current.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
    onMapReady={() => {
      if (following) map.current?.animateToRegion({ latitude: current.latitude, longitude: current.longitude,
        latitudeDelta: 0.004, longitudeDelta: 0.004 }, 0);
    }}
    pitchEnabled={false} rotateEnabled={false} showsMyLocationButton={false}>
    {coordinates.length > 1 ? <Polyline coordinates={coordinates} strokeColor="#B9F532" strokeWidth={5} /> : null}
    <Marker coordinate={coordinates[0]} pinColor="#B9F532" title="Départ de la séance" />
    <Marker coordinate={{ latitude: current.latitude, longitude: current.longitude }}
      pinColor="#BEDFFF" title="Dernière position GPS" />
  </MapView>;
});
