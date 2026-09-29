import type { Database } from '@/types/database';
import { profilesByIds } from '@/services/friends';
import { supabase } from '@/services/supabase';

export type SharedActivity = Database['public']['Tables']['activity_shares']['Row'];
export type FeedItem = { activity: SharedActivity; author: { id: string; username: string; display_name: string } | null };

export async function listFriendFeed(userId: string, page = 0, size = 15): Promise<FeedItem[]> {
  const { data: friendships, error: friendError } = await supabase.from('friendships')
    .select('user_a,user_b').or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (friendError) throw friendError;
  const ids = (friendships ?? []).map((item) => item.user_a === userId ? item.user_b : item.user_a);
  if (!ids.length) return [];
  const { data, error } = await supabase.from('activity_shares')
    .select('activity_id,user_id,activity_type,title,started_at,ended_at,distance_meters,moving_seconds,elapsed_seconds,average_pace_sec_per_km,elevation_gain_meters,run_score,best_5k_seconds,best_10k_seconds')
    .in('user_id', ids).order('started_at', { ascending: false })
    .range(page * size, (page + 1) * size - 1);
  if (error) throw error;
  const authors = await profilesByIds([...new Set((data ?? []).map((item) => item.user_id))]);
  return (data ?? []).map((activity) => ({
    activity, author: authors.find((profile) => profile.id === activity.user_id) ?? null,
  }));
}

export async function getSharedActivity(activityId: string) {
  const { data, error } = await supabase.from('activity_shares')
    .select('activity_id,user_id,activity_type,title,started_at,ended_at,distance_meters,moving_seconds,elapsed_seconds,average_pace_sec_per_km,elevation_gain_meters,run_score,best_5k_seconds,best_10k_seconds')
    .eq('activity_id', activityId).maybeSingle();
  if (error) throw error;
  return data;
}
