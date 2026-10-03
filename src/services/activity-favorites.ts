import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Activity } from '@/types/domain';

const key = (userId: string) => `activity-favorites:${userId}`;

export async function listActivityFavorites(userId: string): Promise<Activity[]> {
  if (!userId) return [];
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return [];
  const stored: unknown = JSON.parse(raw);
  if (!Array.isArray(stored)) throw new Error('Favoris illisibles');
  return (stored as Activity[]).filter((activity) => activity.userId === userId);
}

export async function toggleActivityFavorite(userId: string, activity: Activity): Promise<Activity[]> {
  if (!userId || activity.userId !== userId) throw new Error('Séance inaccessible');
  const previous = await listActivityFavorites(userId);
  const next = previous.some((item) => item.id === activity.id)
    ? previous.filter((item) => item.id !== activity.id)
    : [{ ...activity, points: [], splits: [] }, ...previous];
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}
