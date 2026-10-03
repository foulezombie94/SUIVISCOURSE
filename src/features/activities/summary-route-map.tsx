import { useMemo, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Point } from '@/types/domain';
import { Text } from '@/components/typography';

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1B1D23' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#777B87' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1B1D23' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#31343B' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#151921' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#20242A' }] },
] as const;

export function SummaryRouteMap({ points }: { points: Point[] }) {
  const mapRef = useRef<MapView>(null);
  const coordinates = useMemo(() => {
    const valid = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180);
    const stride = Math.max(1, Math.ceil(valid.length / 450));
    return valid.filter((_, index) => index % stride === 0 || index === valid.length - 1)
      .map((point) => ({ latitude: point.latitude, longitude: point.longitude }));
  }, [points]);

  if (!coordinates.length) return <View style={{ height: 270, backgroundColor: '#1B1D23',
    alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <Text style={{ color: '#A5A8B1', textAlign: 'center', fontSize: 14 }}>
      Aucun tracé GPS disponible pour cette course.</Text>
  </View>;

  const latitudes = coordinates.map((point) => point.latitude);
  const longitudes = coordinates.map((point) => point.longitude);
  const minLat = Math.min(...latitudes); const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes); const maxLon = Math.max(...longitudes);
  const region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.008, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.008, (maxLon - minLon) * 1.6),
  };
  const segments = ['#F52B48', '#FF9B43', '#B9F532'].map((color, index) => {
    const from = Math.floor(index * (coordinates.length - 1) / 3);
    const to = index === 2 ? coordinates.length : Math.ceil((index + 1) * (coordinates.length - 1) / 3) + 1;
    return { color, coordinates: coordinates.slice(from, to) };
  });

  return <MapView ref={mapRef} style={{ width: '100%', height: 270 }} initialRegion={region}
    userInterfaceStyle="dark" customMapStyle={darkMapStyle.map((element) => ({ ...element,
      stylers: [...element.stylers] }))}
    showsUserLocation={false} showsMyLocationButton={false} showsCompass={false}
    pitchEnabled={false} rotateEnabled={false} scrollEnabled zoomEnabled
    onMapReady={() => {
      if (coordinates.length > 1) mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 35, right: 30, bottom: 35, left: 30 }, animated: false,
      });
    }}>
    {segments.map((segment, index) => segment.coordinates.length > 1
      ? <Polyline key={index} coordinates={segment.coordinates} strokeColor={segment.color}
        strokeWidth={5} lineCap="round" lineJoin="round" /> : null)}
    <Marker coordinate={coordinates[0]} title="Départ" anchor={{ x: 0.5, y: 0.5 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF',
        borderWidth: 4, borderColor: '#F52B48' }} />
    </Marker>
    {coordinates.length > 1 ? <Marker coordinate={coordinates[coordinates.length - 1]}
      title="Arrivée" anchor={{ x: 0.5, y: 0.5 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#B9F532',
        borderWidth: 4, borderColor: '#FFFFFF' }} />
    </Marker> : null}
  </MapView>;
}
