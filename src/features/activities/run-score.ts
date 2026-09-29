import type { Activity } from '@/types/domain';

export type RunScore = { score: number; consistency: number; progress: number; endurance: number };
export type HistoryRun = Pick<Activity, 'id' | 'activityType' | 'startedAt' | 'distanceMeters' | 'averagePaceSecPerKm'>;
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};

// A personal, non-medical signal. Speed is compared only with this runner's own history.
export function calculateRunScore(activity: Activity, history: HistoryRun[]): RunScore {
  const previous = history.filter((item) => item.id !== activity.id &&
    item.activityType === activity.activityType && item.startedAt < activity.startedAt).slice(0, 12);
  const splitTimes = activity.splits.map((split) => split.movingSeconds);
  const splitMean = splitTimes.length
    ? splitTimes.reduce((sum, value) => sum + value, 0) / splitTimes.length : 0;
  const variation = splitTimes.length >= 2 && splitMean > 0
    ? Math.sqrt(splitTimes.reduce((sum, value) => sum + (value - splitMean) ** 2, 0) / splitTimes.length) / splitMean
    : 0.15;
  const consistency = clamp(100 - variation * 180);
  const pastPace = median(previous.map((item) => item.averagePaceSecPerKm)
    .filter((value): value is number => value != null && Number.isFinite(value)));
  const progress = pastPace && activity.averagePaceSecPerKm
    ? clamp(65 + (pastPace - activity.averagePaceSecPerKm) / pastPace * 160) : 65;
  const pastDistance = median(previous.map((item) => item.distanceMeters).filter((value) => value > 0));
  const endurance = pastDistance
    ? clamp(60 + (activity.distanceMeters - pastDistance) / pastDistance * 45)
    : clamp(50 + Math.min(activity.distanceMeters / 1000, 10) * 3);
  const score = clamp(consistency * 0.3 + progress * 0.4 + endurance * 0.3);
  return { score, consistency, progress, endurance };
}
