import type { Activity } from '@/types/domain';
import { calculateRunScore } from '@/features/activities/run-score';
import { supabase } from '@/services/supabase';

export async function syncRunScore(activity: Activity, history: Activity[]) {
  const remote = await supabase.from('activities')
    .select('id,activity_type,started_at,distance_meters,average_pace_sec_per_km')
    .eq('user_id', activity.userId).eq('activity_type', activity.activityType)
    .lt('started_at', activity.startedAt).order('started_at', { ascending: false }).limit(12);
  if (remote.error) throw remote.error;
  const previous = (remote.data ?? []).map((row) => ({
    id: row.id, activityType: row.activity_type as Activity['activityType'],
    startedAt: row.started_at, distanceMeters: row.distance_meters,
    averagePaceSecPerKm: row.average_pace_sec_per_km,
  }));
  const combined = [...history, ...previous].filter((item, index, all) =>
    all.findIndex((other) => other.id === item.id) === index);
  const result = calculateRunScore(activity, combined);
  const { error } = await supabase.from('run_scores').upsert({
    activity_id: activity.id, user_id: activity.userId, ...result,
  }, { onConflict: 'activity_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function getRunScore(activityId: string) {
  const { data, error } = await supabase.from('run_scores')
    .select('score,consistency,progress,endurance').eq('activity_id', activityId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBadges(userId: string) {
  const { data, error } = await supabase.from('user_achievements')
    .select('code,awarded_at,achievements(title,description)')
    .eq('user_id', userId).order('awarded_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listGoals(userId: string) {
  const { data, error } = await supabase.rpc('my_goal_progress');
  if (error) throw error;
  return data ?? [];
}

export type GoalKind = 'distance' | 'runs' | 'best_5k' | 'best_10k';
export async function saveGoal(userId: string, kind: GoalKind,
  period: 'week' | 'month' | 'all_time', targetValue: number) {
  const { error } = await supabase.from('goals').upsert({
    user_id: userId, kind, period, target_value: targetValue,
  }, { onConflict: 'user_id,kind,period' });
  if (error) throw error;
}

export async function deleteGoal(goalId: string) {
  const { error } = await supabase.from('goals').delete().eq('id', goalId);
  if (error) throw error;
}
