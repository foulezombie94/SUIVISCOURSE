import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_HEIGHT_CM, MAX_WEIGHT_KG, MIN_HEIGHT_CM, MIN_WEIGHT_KG } from './runner-profile-limits';

export const runnerProfileDraftKey = 'runner-profile-draft-v1';
export const pendingRunnerProfileUserKey = 'runner-profile-pending-user-v1';

export type RunningLevel = 'beginner' | 'occasional' | 'regular';
export type RunnerProfileDraft = {
  age?: number;
  weightKg?: number;
  heightCm?: number;
  runningLevel?: RunningLevel;
  runsPerWeek?: 1 | 3 | 5;
};

export function normalizeRunnerProfile(raw: unknown): RunnerProfileDraft {
  if (!raw || typeof raw !== 'object') return {};
  const value = raw as RunnerProfileDraft;
  return {
    age: Number.isInteger(value.age) && value.age! >= 10 && value.age! <= 110 ? value.age : undefined,
    weightKg: typeof value.weightKg === 'number' && Number.isFinite(value.weightKg) &&
      value.weightKg >= MIN_WEIGHT_KG && value.weightKg <= MAX_WEIGHT_KG ? value.weightKg : undefined,
    heightCm: Number.isInteger(value.heightCm) && value.heightCm! >= MIN_HEIGHT_CM &&
      value.heightCm! <= MAX_HEIGHT_CM ? value.heightCm : undefined,
    runningLevel: ['beginner', 'occasional', 'regular'].includes(value.runningLevel ?? '')
      ? value.runningLevel : undefined,
    runsPerWeek: value.runsPerWeek === 1 || value.runsPerWeek === 3 || value.runsPerWeek === 5
      ? value.runsPerWeek : undefined,
  };
}

export async function loadRunnerProfileDraft(): Promise<RunnerProfileDraft> {
  try {
    const stored = await AsyncStorage.getItem(runnerProfileDraftKey);
    if (!stored) return {};
    return normalizeRunnerProfile(JSON.parse(stored) as unknown);
  } catch { return {}; }
}

export async function saveRunnerProfileDraft(value: RunnerProfileDraft) {
  await AsyncStorage.setItem(runnerProfileDraftKey, JSON.stringify(value));
}
