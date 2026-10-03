import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadRunnerProfileDraft, normalizeRunnerProfile, pendingRunnerProfileUserKey,
  runnerProfileDraftKey, type RunnerProfileDraft } from '@/features/onboarding/runner-profile-draft';
import { supabase } from '@/services/supabase';

const fields = 'age,weight_kg,height_cm,running_level,runs_per_week';

export async function saveRunnerProfile(userId: string, value: RunnerProfileDraft): Promise<RunnerProfileDraft> {
  const profile = normalizeRunnerProfile(value);
  const { data, error } = await supabase.from('runner_profiles').upsert({
    user_id: userId,
    age: profile.age ?? null,
    weight_kg: profile.weightKg ?? null,
    height_cm: profile.heightCm ?? null,
    running_level: profile.runningLevel ?? null,
    runs_per_week: profile.runsPerWeek ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).select(fields).single();
  if (error) throw error;
  return normalizeRunnerProfile({
    age: data.age,
    weightKg: data.weight_kg == null ? undefined : Number(data.weight_kg),
    heightCm: data.height_cm,
    runningLevel: data.running_level,
    runsPerWeek: data.runs_per_week,
  });
}

export async function getRunnerProfile(userId: string, legacyMetadata: unknown): Promise<RunnerProfileDraft> {
  // Bind measurements filled before email confirmation to their own account.
  if (await AsyncStorage.getItem(pendingRunnerProfileUserKey) === userId) {
    const pending = await loadRunnerProfileDraft();
    if (Object.values(pending).some((value) => value != null)) await saveRunnerProfile(userId, pending);
    await AsyncStorage.multiRemove([pendingRunnerProfileUserKey, runnerProfileDraftKey]);
  }
  const { data, error } = await supabase.from('runner_profiles')
    .select(fields).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data) return normalizeRunnerProfile({
    age: data.age,
    weightKg: data.weight_kg == null ? undefined : Number(data.weight_kg),
    heightCm: data.height_cm,
    runningLevel: data.running_level,
    runsPerWeek: data.runs_per_week,
  });
  const legacy = normalizeRunnerProfile(legacyMetadata);
  return Object.values(legacy).some((value) => value != null)
    ? saveRunnerProfile(userId, legacy) : {};
}
