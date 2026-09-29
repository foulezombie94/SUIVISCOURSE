import type { Activity } from '@/types/domain';

export type RecordType = 'fastest_1k' | 'fastest_5k' | 'fastest_10k' | 'longest_run';
export type RecordCandidate = { recordType: RecordType; value: number };

export function candidates(activity: Activity): RecordCandidate[] {
  if (activity.activityType !== 'running' || activity.distanceMeters <= 0) return [];
  const values: RecordCandidate[] = [{ recordType: 'longest_run', value: activity.distanceMeters }];
  const splitTimes = activity.splits.map((split) => split.movingSeconds);
  if (splitTimes.length >= 1) values.push({ recordType: 'fastest_1k', value: Math.min(...splitTimes) });
  if (splitTimes.length >= 5) {
    values.push({ recordType: 'fastest_5k', value: fastestWindow(splitTimes, 5) });
  }
  if (splitTimes.length >= 10) {
    values.push({ recordType: 'fastest_10k', value: fastestWindow(splitTimes, 10) });
  }
  return values;
}

function fastestWindow(splits: number[], length: number) {
  let sum = splits.slice(0, length).reduce((a, b) => a + b, 0);
  let fastest = sum;
  for (let i = length; i < splits.length; i++) {
    sum += splits[i] - splits[i - length];
    fastest = Math.min(fastest, sum);
  }
  return fastest;
}

export function personalRecords(activities: Activity[]) {
  const best = new Map<RecordType, { value: number; activityId: string; achievedAt: string }>();
  for (const activity of activities) {
    for (const candidate of candidates(activity)) {
      const old = best.get(candidate.recordType);
      const better = candidate.recordType === 'longest_run'
        ? !old || candidate.value > old.value
        : !old || candidate.value < old.value;
      if (better) best.set(candidate.recordType, {
        value: candidate.value, activityId: activity.id, achievedAt: activity.endedAt,
      });
    }
  }
  return best;
}
