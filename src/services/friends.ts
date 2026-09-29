import type { FriendRequest, Profile } from '@/types/domain';
import { supabase } from '@/services/supabase';

export async function getMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles')
    .select('id,username,display_name,avatar_url,bio,friend_code').eq('id', userId).single();
  if (error || !data) throw error ?? new Error('Profil introuvable');
  return data;
}
export async function findByCode(code: string): Promise<Pick<Profile,'id'|'username'|'display_name'> | null> {
  const { data, error } = await supabase.rpc('find_friend_by_code', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data?.[0] ?? null;
}
export async function sendFriendRequest(senderId: string, receiverId: string) {
  const { error } = await supabase.from('friend_requests').insert({ sender_id: senderId, receiver_id: receiverId });
  if (error) throw error;
}
export async function listRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase.from('friend_requests')
    .select('id,sender_id,receiver_id,status,created_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status','pending').order('created_at',{ ascending: false });
  if (error) throw error;
  return (data ?? []).map((request) => ({ ...request, status: 'pending' as const }));
}
export async function profilesByIds(ids: string[]): Promise<Profile[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from('profiles')
    .select('id,username,display_name,avatar_url,bio,friend_code').in('id', ids);
  if (error) throw error;
  return data ?? [];
}
export async function answerRequest(id: string, accept: boolean) {
  if (accept) {
    const { error } = await supabase.rpc('accept_friend_request', { p_request_id: id });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', id);
    if (error) throw error;
  }
}
export async function listFriends(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase.from('friendships')
    .select('user_a,user_b').or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.user_a === userId ? row.user_b : row.user_a);
  if (!ids.length) return [];
  const profiles = await supabase.from('profiles')
    .select('id,username,display_name,avatar_url,bio,friend_code').in('id', ids);
  if (profiles.error) throw profiles.error;
  return profiles.data ?? [];
}
export async function removeFriend(userId: string, friendId: string) {
  const a = userId < friendId ? userId : friendId;
  const b = userId < friendId ? friendId : userId;
  const { error } = await supabase.from('friendships').delete().eq('user_a', a).eq('user_b', b);
  if (error) throw error;
}
