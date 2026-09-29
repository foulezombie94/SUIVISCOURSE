import type { Database } from '@/types/database';
import { supabase } from '@/services/supabase';

export type Battle = Database['public']['Tables']['run_battles']['Row'];
export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type BattleKind = 'first_to_distance' | 'most_distance' | 'most_runs' | 'best_5k' | 'best_10k';

export async function listBattles(userId: string) {
  const { data, error } = await supabase.from('run_battles')
    .select('id,creator_id,kind,target_value,starts_at,ends_at,participant_ids,created_at')
    .contains('participant_ids', [userId]).order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function createBattle(userId: string, friends: string[], kind: BattleKind,
  targetValue: number | null, days: number) {
  const now = new Date();
  const end = new Date(now.getTime() + days * 86400_000);
  const { error } = await supabase.from('run_battles').insert({
    creator_id: userId, kind, target_value: kind === 'first_to_distance' ? targetValue : null,
    starts_at: now.toISOString(), ends_at: end.toISOString(),
    participant_ids: [userId, ...friends],
  });
  if (error) throw error;
}

export async function battleMembers(battleId: string) {
  const { data, error } = await supabase.from('battle_members')
    .select('user_id,status').eq('battle_id', battleId);
  if (error) throw error;
  return data ?? [];
}

export async function answerBattle(battleId: string, userId: string, accept: boolean) {
  const { error } = await supabase.from('battle_members')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('battle_id', battleId).eq('user_id', userId);
  if (error) throw error;
}

export async function getBattleProgress(battleId: string) {
  const { data, error } = await supabase.rpc('battle_progress', { p_battle_id: battleId });
  if (error) throw error;
  return data ?? [];
}

export async function getBattleMilestones(battleId: string) {
  const { data, error } = await supabase.from('battle_milestones')
    .select('user_id,reached_at').eq('battle_id', battleId).order('reached_at');
  if (error) throw error;
  return data ?? [];
}

export async function listChallenges() {
  const { data, error } = await supabase.from('challenges')
    .select('id,creator_id,title,kind,target_value,is_official,recurrence,starts_at,ends_at,invited_ids,created_at')
    .order('is_official', { ascending: false }).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function createChallenge(userId: string, title: string, kind: 'distance' | 'runs',
  targetValue: number, friends: string[], days: number) {
  const now = new Date();
  const { error } = await supabase.from('challenges').insert({
    creator_id: userId, title: title.trim(), kind, target_value: targetValue,
    starts_at: now.toISOString(), ends_at: new Date(now.getTime() + days * 86400_000).toISOString(),
    invited_ids: friends,
  });
  if (error) throw error;
}

export async function challengeMembers(challengeId: string) {
  const { data, error } = await supabase.from('challenge_members')
    .select('user_id,status').eq('challenge_id', challengeId);
  if (error) throw error;
  return data ?? [];
}

export async function joinOfficialChallenge(challengeId: string, userId: string) {
  const { error } = await supabase.from('challenge_members')
    .insert({ challenge_id: challengeId, user_id: userId, status: 'accepted' });
  if (error) throw error;
}

export async function answerChallenge(challengeId: string, userId: string, accept: boolean) {
  const { error } = await supabase.from('challenge_members')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('challenge_id', challengeId).eq('user_id', userId);
  if (error) throw error;
}

export async function getChallengeProgress(challengeId: string) {
  const { data, error } = await supabase.rpc('challenge_progress', { p_challenge_id: challengeId });
  if (error) throw error;
  return data ?? [];
}

export async function friendLeaderboard(start: Date, end: Date) {
  const { data, error } = await supabase.rpc('friend_leaderboard', {
    p_start: start.toISOString(), p_end: end.toISOString(),
  });
  if (error) throw error;
  return data ?? [];
}
