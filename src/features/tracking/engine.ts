import type { ActiveActivity, Point } from '@/types/domain';

const R = 6_371_000;
export function distanceMeters(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function averagePace(value: Pick<ActiveActivity, 'movingSeconds' | 'distanceMeters'>): number | null {
  return value.distanceMeters >= 100 ? value.movingSeconds / (value.distanceMeters / 1000) : null;
}
export function tick(activity: ActiveActivity, now: number): ActiveActivity {
  return { ...activity, lastTickAt: now,
    elapsedSeconds: Math.max(activity.elapsedSeconds, (now - activity.startedAt) / 1000) };
}
export function ingest(activity: ActiveActivity, point: Point, points: Point[]): ActiveActivity {
  if (activity.state === 'paused' || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
      Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180 ||
      (point.accuracy ?? 1000) > 35 || point.timestamp <= activity.lastObservationAt) return activity;
  const previous = points.at(-1);
  if (!previous) { points.push(point); return { ...activity, lastObservationAt: point.timestamp }; }
  if (activity.discardNextLocation) {
    points.push(point);
    return { ...activity, lastObservationAt: point.timestamp, discardNextLocation: false };
  }
  const dt = (point.timestamp - activity.lastObservationAt) / 1000;
  if (dt <= 0) return activity;
  if (dt > 60) {
    points.push(point);
    return { ...activity, lastObservationAt: point.timestamp, stationarySeconds: 0, recoverySeconds: 0 };
  }
  const meters = distanceMeters(previous, point);
  const noiseFloor = Math.max(3, Math.min(8, (point.accuracy ?? 10) * 0.35));
  if (meters <= noiseFloor) {
    const stationarySeconds = activity.stationarySeconds + Math.min(dt, 10);
    points[points.length - 1] = point;
    return { ...activity, lastObservationAt: point.timestamp, stationarySeconds, recoverySeconds: 0,
      state: activity.autoPause && stationarySeconds >= 12 ? 'autoPaused' : activity.state };
  }
  const pointDt = (point.timestamp - previous.timestamp) / 1000;
  if (pointDt <= 0 || meters / pointDt > 12) {
    return { ...activity, lastObservationAt: point.timestamp, discardNextLocation: true };
  }
  // Compare the distance and time of the same two GPS fixes.
  if (meters / pointDt < 0.35) {
    const stationarySeconds = activity.stationarySeconds + Math.min(dt, 10);
    points[points.length - 1] = point;
    return { ...activity, lastObservationAt: point.timestamp,
      stationarySeconds, recoverySeconds: 0,
      state: activity.autoPause && stationarySeconds >= 12 ? 'autoPaused' : activity.state };
  }
  const recoverySeconds = activity.state === 'autoPaused' ? activity.recoverySeconds + Math.min(dt, 5) : 0;
  if (activity.state === 'autoPaused' && recoverySeconds < 4) {
    return { ...activity, lastObservationAt: point.timestamp, recoverySeconds, stationarySeconds: 0 };
  }
  const state = 'running';
  const movementIntervalSeconds = activity.state === 'autoPaused' ? recoverySeconds : dt;
  const movingSeconds = activity.movingSeconds + movementIntervalSeconds;
  const nextDistance = activity.distanceMeters + meters;
  const elevation = previous.altitude != null && point.altitude != null &&
    (point.altitudeAccuracy ?? 100) <= 15 && (previous.altitudeAccuracy ?? 100) <= 15
    ? point.altitude - previous.altitude : 0;
  const splits = [...activity.splits];
  let lastSplitMovingSeconds = activity.lastSplitMovingSeconds;
  while (Math.floor(nextDistance / 1000) > splits.length) {
    const boundary = (splits.length + 1) * 1000;
    const fraction = Math.max(0, Math.min(1, (boundary - activity.distanceMeters) / meters));
    const boundaryMovingSeconds = activity.movingSeconds + movementIntervalSeconds * fraction;
    splits.push({ kilometer: splits.length + 1,
      movingSeconds: Math.max(1, Math.round(boundaryMovingSeconds - lastSplitMovingSeconds)),
      elapsedSeconds: Math.max(1, Math.round((activity.lastObservationAt + dt * 1000 * fraction - activity.startedAt) / 1000)) });
    lastSplitMovingSeconds = boundaryMovingSeconds;
  }
  points.push(point);
  return {
    ...activity, state, lastObservationAt: point.timestamp,
    distanceMeters: nextDistance, movingSeconds,
    elevationGainMeters: activity.elevationGainMeters + (elevation > 2 ? elevation : 0),
    elevationLossMeters: activity.elevationLossMeters + (elevation < -2 ? -elevation : 0),
    splits, lastSplitMovingSeconds, stationarySeconds: 0, recoverySeconds: 0,
  };
}
