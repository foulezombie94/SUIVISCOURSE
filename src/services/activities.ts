import type { Activity, Point, Split } from '@/types/domain';
import { candidates } from '@/features/activities/records';
import { safeRoute } from '@/features/sharing/privacy';
import { syncRunScore } from '@/services/progression';
import { getLocalActivity, listLocalSummaries, markSynced, saveActivity } from '@/services/local-activities';
import { getSharedActivity } from '@/services/feed';
import { supabase } from '@/services/supabase';

const summaryFields = 'id,user_id,activity_type,started_at,ended_at,elapsed_seconds,moving_seconds,distance_meters,average_pace_sec_per_km,elevation_gain_meters,elevation_loss_meters,visibility,title,hide_radius_meters,verification_status';
type Remote = {
  id: string; user_id: string; activity_type: Activity['activityType'];
  started_at: string; ended_at: string; elapsed_seconds: number; moving_seconds: number;
  distance_meters: number; average_pace_sec_per_km: number | null;
  elevation_gain_meters: number; elevation_loss_meters: number;
  visibility: Activity['visibility']; title: string; hide_radius_meters: Activity['hideRadiusMeters'];
  verification_status: Activity['verificationStatus'];
};
function fromRemote(row: Remote): Activity {
  return { id: row.id, userId: row.user_id, activityType: row.activity_type,
    startedAt: row.started_at, endedAt: row.ended_at, elapsedSeconds: row.elapsed_seconds,
    movingSeconds: row.moving_seconds, distanceMeters: row.distance_meters,
    averagePaceSecPerKm: row.average_pace_sec_per_km,
    elevationGainMeters: row.elevation_gain_meters, elevationLossMeters: row.elevation_loss_meters,
    visibility: row.visibility, title: row.title, hideRadiusMeters: row.hide_radius_meters,
    points: [], splits: [], syncState: 'synced', verificationStatus: row.verification_status };
}

async function syncRecords(activity: Activity) {
  const current = await supabase.from('personal_records').select('record_type,value').eq('user_id', activity.userId);
  if (current.error) throw current.error;
  for (const candidate of candidates(activity)) {
    const old = current.data?.find((row) => row.record_type === candidate.recordType);
    const better = !old || (candidate.recordType === 'longest_run'
      ? candidate.value > old.value : candidate.value < old.value);
    if (!better) continue;
    const { error } = await supabase.from('personal_records').upsert({
      user_id: activity.userId, record_type: candidate.recordType,
      value: candidate.value, activity_id: activity.id, achieved_at: activity.endedAt,
    }, { onConflict: 'user_id,record_type' });
    if (error) throw error;
  }
}

export async function syncPending(userId: string) {
  const history = await listLocalSummaries(userId);
  const pending = history.filter((item) => item.syncState === 'pending');
  for (const summary of pending) {
    const activity = await getLocalActivity(userId, summary.id);
    if (!activity) continue;
    const { error } = await supabase.from('activities').upsert({
      id: activity.id, user_id: activity.userId, activity_type: activity.activityType,
      started_at: activity.startedAt, ended_at: activity.endedAt,
      elapsed_seconds: Math.round(activity.elapsedSeconds),
      moving_seconds: Math.min(Math.round(activity.movingSeconds), Math.round(activity.elapsedSeconds)),
      distance_meters: activity.distanceMeters,
      average_pace_sec_per_km: activity.averagePaceSecPerKm,
      elevation_gain_meters: activity.elevationGainMeters,
      elevation_loss_meters: activity.elevationLossMeters,
      visibility: activity.visibility, title: activity.title,
      shared_route: safeRoute(activity.points, activity.hideRadiusMeters),
      hide_radius_meters: activity.hideRadiusMeters,
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
    for (let offset = 0; offset < activity.points.length; offset += 100) {
      const rows = activity.points.slice(offset, offset + 100).map((point, index) => ({
        activity_id: activity.id, user_id: userId, sequence: offset + index,
        latitude: point.latitude, longitude: point.longitude, altitude: point.altitude,
        accuracy: point.accuracy, altitude_accuracy: point.altitudeAccuracy,
        speed: point.speed, recorded_at: new Date(point.timestamp).toISOString(),
      }));
      const result = await supabase.from('activity_points')
        .upsert(rows, { onConflict: 'activity_id,sequence', ignoreDuplicates: true });
      if (result.error) throw result.error;
    }
    if (activity.splits.length) {
      const result = await supabase.from('activity_splits').upsert(activity.splits.map((split) => ({
        activity_id: activity.id, user_id: userId, kilometer: split.kilometer,
        moving_seconds: split.movingSeconds, elapsed_seconds: split.elapsedSeconds,
      })), { onConflict: 'activity_id,kilometer', ignoreDuplicates: true });
      if (result.error) throw result.error;
    }
    const verification = await supabase.from('activities').select('verification_status').eq('id', activity.id).single();
    if (verification.error) throw verification.error;
    if (verification.data.verification_status === 'normal') await syncRecords(activity);
    await syncRunScore(activity, history);
    await markSynced(userId, activity.id,
      verification.data.verification_status as Activity['verificationStatus']);
  }
}

export async function listActivities(userId: string, page = 0, size = 20): Promise<Activity[]> {
  const local = page === 0 ? await listLocalSummaries(userId) : [];
  const remote = await supabase.from('activities').select(summaryFields)
    .eq('user_id', userId).order('started_at', { ascending: false })
    .range(page * size, (page + 1) * size - 1);
  if (remote.error) {
    if (page === 0) return local;
    throw remote.error;
  }
  const remoteActivities = (remote.data as Remote[]).map(fromRemote);
  const pending = local.filter((item) => item.syncState === 'pending');
  const pendingIds = new Set(pending.map((item) => item.id));
  return [...pending, ...remoteActivities.filter((item) => !pendingIds.has(item.id))]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getActivity(userId: string, id: string): Promise<Activity | null> {
  const local = await getLocalActivity(userId, id);
  if (local) return local;
  const result = await supabase.from('activities').select(summaryFields).eq('id', id).single();
  if (result.error || !result.data) {
    const shared = await getSharedActivity(id);
    return shared ? {
      id: shared.activity_id, userId: shared.user_id,
      activityType: shared.activity_type as Activity['activityType'],
      title: shared.title, startedAt: shared.started_at, endedAt: shared.ended_at,
      distanceMeters: shared.distance_meters, movingSeconds: shared.moving_seconds,
      elapsedSeconds: shared.elapsed_seconds, averagePaceSecPerKm: shared.average_pace_sec_per_km,
      elevationGainMeters: shared.elevation_gain_meters, elevationLossMeters: 0,
      visibility: 'friends', hideRadiusMeters: 400, points: [], splits: [], syncState: 'synced',
    } : null;
  }
  const activity = fromRemote(result.data as Remote);
  const splits = await supabase.from('activity_splits')
    .select('kilometer,moving_seconds,elapsed_seconds').eq('activity_id', id).order('kilometer');
  if (splits.error) throw splits.error;
  activity.splits = (splits.data ?? []).map((row): Split => ({
    kilometer: row.kilometer, movingSeconds: row.moving_seconds,
    elapsedSeconds: row.elapsed_seconds,
  }));
  for (let offset = 0; ; offset += 500) {
    const points = await supabase.from('activity_points')
      .select('latitude,longitude,altitude,accuracy,altitude_accuracy,speed,recorded_at')
      .eq('activity_id', id).order('sequence').range(offset, offset + 499);
    if (points.error) throw points.error;
    activity.points.push(...(points.data ?? []).map((row): Point => ({
      latitude: row.latitude, longitude: row.longitude, altitude: row.altitude,
      accuracy: row.accuracy, altitudeAccuracy: row.altitude_accuracy,
      speed: row.speed, timestamp: Date.parse(row.recorded_at),
    })));
    if ((points.data?.length ?? 0) < 500) break;
  }
  return activity;
}

export async function setVisibility(activity: Activity, visibility: Activity['visibility']) {
  const { error } = await supabase.from('activities').update({
    visibility, shared_route: safeRoute(activity.points, activity.hideRadiusMeters),
  }).eq('id', activity.id);
  if (error) throw error;
  await saveActivity({ ...activity, visibility, syncState: 'synced' });
}
