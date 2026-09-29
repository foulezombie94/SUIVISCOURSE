import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveActivity, Activity, Point } from '@/types/domain';

export type StoredActiveActivity = ActiveActivity & { points: Point[] };

const activeKey = (userId: string) => `active:${userId}`;
const indexKey = (userId: string) => `activity-index:${userId}`;
const summariesKey = (userId: string) => `activity-summaries:${userId}`;
const itemKey = (userId: string, id: string) => `activity:${userId}:${id}`;
const summaryOf = (activity: Activity): Activity => ({ ...activity, points: [], splits: [] });

export async function saveActive(activity: ActiveActivity, points: Point[]) {
  await AsyncStorage.setItem(activeKey(activity.userId), JSON.stringify({ ...activity, points }));
}
export async function loadActive(userId: string): Promise<StoredActiveActivity | null> {
  const value = await AsyncStorage.getItem(activeKey(userId));
  return value ? JSON.parse(value) as StoredActiveActivity : null;
}
export async function clearActive(userId: string) {
  await AsyncStorage.removeItem(activeKey(userId));
}
export async function saveActivity(activity: Activity) {
  await AsyncStorage.setItem(itemKey(activity.userId, activity.id), JSON.stringify(activity));
  const raw = await AsyncStorage.getItem(indexKey(activity.userId));
  const ids = raw ? JSON.parse(raw) as string[] : [];
  await AsyncStorage.setItem(indexKey(activity.userId),
    JSON.stringify([activity.id, ...ids.filter((id) => id !== activity.id)]));
  const oldSummaries = await AsyncStorage.getItem(summariesKey(activity.userId));
  const summaries = oldSummaries ? JSON.parse(oldSummaries) as Activity[] : [];
  await AsyncStorage.setItem(summariesKey(activity.userId), JSON.stringify([
    summaryOf(activity), ...summaries.filter((item) => item.id !== activity.id),
  ]));
}
export async function listLocalSummaries(userId: string): Promise<Activity[]> {
  const rawIds = await AsyncStorage.getItem(indexKey(userId));
  const ids = rawIds ? JSON.parse(rawIds) as string[] : [];
  if (!ids.length) return [];
  const rawSummaries = await AsyncStorage.getItem(summariesKey(userId));
  const cached = rawSummaries ? JSON.parse(rawSummaries) as Activity[] : [];
  const byId = new Map(cached.map((item) => [item.id, item]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    const rows = await AsyncStorage.multiGet(missing.map((id) => itemKey(userId, id)));
    for (const [, value] of rows) if (value) {
      const activity = JSON.parse(value) as Activity;
      byId.set(activity.id, summaryOf(activity));
    }
    await AsyncStorage.setItem(summariesKey(userId),
      JSON.stringify(ids.flatMap((id) => byId.has(id) ? [byId.get(id)] : [])));
  }
  return ids.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
}
export async function listLocalActivities(userId: string): Promise<Activity[]> {
  const raw = await AsyncStorage.getItem(indexKey(userId));
  const ids = raw ? JSON.parse(raw) as string[] : [];
  const rows = await AsyncStorage.multiGet(ids.map((id) => itemKey(userId, id)));
  return rows.flatMap(([, value]) => value ? [JSON.parse(value) as Activity] : []);
}
export async function getLocalActivity(userId: string, id: string): Promise<Activity | null> {
  const raw = await AsyncStorage.getItem(itemKey(userId, id));
  return raw ? JSON.parse(raw) as Activity : null;
}
export async function markSynced(userId: string, id: string,
  verificationStatus: Activity['verificationStatus'] = 'normal') {
  const activity = await getLocalActivity(userId, id);
  if (activity) await AsyncStorage.setItem(itemKey(userId, id),
    JSON.stringify({ ...activity, syncState: 'synced', verificationStatus }));
  const raw = await AsyncStorage.getItem(summariesKey(userId));
  if (raw) await AsyncStorage.setItem(summariesKey(userId), JSON.stringify(
    (JSON.parse(raw) as Activity[]).map((item) => item.id === id
      ? { ...item, syncState: 'synced', verificationStatus } : item)));
}
