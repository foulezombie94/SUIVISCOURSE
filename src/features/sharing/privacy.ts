import type { Point } from '@/types/domain';
import { distanceMeters } from '@/features/tracking/engine';

export function safeRoute(points: Point[], hideRadiusMeters: number): [number, number][] {
  if (points.length < 3) return [];
  const start = points[0];
  const end = points[points.length - 1];
  const visible = points
    .filter((point) => distanceMeters(start, point) > hideRadiusMeters &&
      distanceMeters(end, point) > hideRadiusMeters)
    .filter((_, index) => index % 3 === 0);
  const stride = Math.max(1, Math.ceil(visible.length / 500));
  return visible.filter((_, index) => index % stride === 0)
    .map((point) => [Number(point.latitude.toFixed(5)), Number(point.longitude.toFixed(5))]);
}
