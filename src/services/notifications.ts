import { supabase } from '@/services/supabase';

export async function listNotifications(userId: string) {
  const { data, error } = await supabase.from('notifications')
    .select('id,kind,entity_id,title,body,created_at,read_at,actor_id')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications')
    .update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function inviteRunTogether(activityId: string, hostId: string, friendIds: string[]) {
  const { error } = await supabase.from('activity_participants').insert(friendIds.map((userId) => ({
    activity_id: activityId, host_id: hostId, user_id: userId, status: 'invited',
  })));
  if (error) throw error;
}

export async function listRunTogether(activityId: string) {
  const { data, error } = await supabase.from('activity_participants')
    .select('user_id,status').eq('activity_id', activityId);
  if (error) throw error;
  return data ?? [];
}

export async function listMyRunTogetherInvites(userId: string) {
  const { data, error } = await supabase.from('activity_participants')
    .select('activity_id,host_id,status,invited_at')
    .eq('user_id', userId).eq('status', 'invited').order('invited_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function answerRunTogether(activityId: string, userId: string, accept: boolean) {
  const { error } = await supabase.from('activity_participants')
    .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('activity_id', activityId).eq('user_id', userId);
  if (error) throw error;
}
