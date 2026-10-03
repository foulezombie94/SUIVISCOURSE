import type { GuidedWorkout } from '@/features/programmes/workout-types';

export type ActivityType = 'running' | 'walking' | 'trail';
export type Visibility = 'private' | 'friends';
export type Point = {
  latitude: number; longitude: number; altitude: number | null;
  accuracy: number | null; altitudeAccuracy?: number | null;
  speed: number | null; timestamp: number;
};
export type Split = { kilometer: number; movingSeconds: number; elapsedSeconds: number };
export type Activity = {
  id: string; userId: string; activityType: ActivityType;
  startedAt: string; endedAt: string; elapsedSeconds: number; movingSeconds: number;
  distanceMeters: number; averagePaceSecPerKm: number | null;
  elevationGainMeters: number; elevationLossMeters: number;
  visibility: Visibility; title: string; hideRadiusMeters: 0 | 200 | 400 | 800;
  points: Point[]; splits: Split[]; syncState: 'pending' | 'synced';
  verificationStatus?: 'normal' | 'suspicious' | 'manual';
  workout?: GuidedWorkout;
};
export type ActiveActivity = {
  id: string; userId: string; activityType: ActivityType;
  startedAt: number; lastTickAt: number; lastObservationAt: number;
  elapsedSeconds: number; movingSeconds: number; distanceMeters: number;
  elevationGainMeters: number; elevationLossMeters: number;
  splits: Split[]; state: 'running' | 'paused' | 'autoPaused';
  autoPause: boolean; stationarySeconds: number; recoverySeconds: number;
  lastSplitMovingSeconds: number; discardNextLocation?: boolean;
  pausedDurationSeconds?: number; pausedAt?: number | null;
  smoothedAltitudeMeters?: number | null; elevationAnchorMeters?: number | null;
  workout?: GuidedWorkout;
};
export type Profile = {
  id: string; username: string; display_name: string;
  avatar_url: string | null; bio: string | null; friend_code: string;
};
export type FriendRequest = {
  id: string; sender_id: string; receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected'; created_at: string;
};
