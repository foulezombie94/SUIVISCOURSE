import Svg, { Circle, Polyline } from 'react-native-svg';
import type { Point } from '@/types/domain';
import { safeRoute } from '@/features/sharing/privacy';

export function RouteArt({ points, hideRadiusMeters = 400, color = '#C7F36B' }: {
  points: Point[]; hideRadiusMeters?: number; color?: string;
}) {
  const safe = safeRoute(points, hideRadiusMeters);
  if (safe.length < 2) return <Svg width="100%" height={160} viewBox="0 0 300 160" />;
  const lats = safe.map(([lat]) => lat); const lons = safe.map(([, lon]) => lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const dx = Math.max(0.00001, maxLon - minLon);
  const dy = Math.max(0.00001, maxLat - minLat);
  const coords = safe.map(([lat, lon]) =>
    `${20 + (lon - minLon) / dx * 260},${140 - (lat - minLat) / dy * 120}`).join(' ');
  const first = coords.split(' ')[0].split(',').map(Number);
  const last = coords.split(' ').at(-1)!.split(',').map(Number);
  return <Svg width="100%" height={160} viewBox="0 0 300 160">
    <Polyline points={coords} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={first[0]} cy={first[1]} r={6} fill="#8BD8D0" />
    <Circle cx={last[0]} cy={last[1]} r={6} fill="#FFA87E" />
  </Svg>;
}
