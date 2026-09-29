import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import type { ActiveActivity, Activity, ActivityType, Point } from '@/types/domain';
import { averagePace, ingest, tick } from '@/features/tracking/engine';
import { clearActive, loadActive, saveActive, saveActivity } from '@/services/local-activities';
import { syncPending } from '@/services/activities';

let watch: Location.LocationSubscription | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
let watchGeneration = 0;
let lastSave = 0;
let persistence: Promise<void> = Promise.resolve();
let trackBuffer: Point[] = [];
export const getTrackPoints = () => trackBuffer;
const persist = (value: ActiveActivity) => {
  const points = trackBuffer.slice();
  persistence = persistence.catch(() => undefined).then(() => saveActive(value, points));
  return persistence;
};
function stopWatch() {
  watchGeneration += 1;
  watch?.remove();
  watch = null;
  if (ticker) clearInterval(ticker);
  ticker = null;
}
function toPoint(value: Location.LocationObject): Point {
  return {
    latitude: value.coords.latitude, longitude: value.coords.longitude,
    altitude: value.coords.altitude, accuracy: value.coords.accuracy,
    altitudeAccuracy: value.coords.altitudeAccuracy,
    speed: value.coords.speed, timestamp: value.timestamp,
  };
}
async function beginWatch() {
  stopWatch();
  const generation = watchGeneration;
  const subscription = await Location.watchPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2500, distanceInterval: 0,
  }, (position) => {
    if (generation !== watchGeneration) return;
    const current = useRunStore.getState().active;
    if (!current) return;
    const next = ingest(current, toPoint(position), trackBuffer);
    if (next === current) return;
    useRunStore.setState({ active: next, routeVersion: trackBuffer.length });
    if (next.splits.length > current.splits.length) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (Date.now() - lastSave >= 3000) {
      lastSave = Date.now();
      void persist(next).catch(() => useRunStore.setState({
        error: 'Sauvegarde locale impossible. Vérifie l’espace disponible.',
      }));
    }
  });
  if (generation !== watchGeneration) {
    subscription.remove();
    return;
  }
  watch = subscription;
  ticker = setInterval(() => {
    const current = useRunStore.getState().active;
    if (!current) return;
    const next = tick(current, Date.now());
    useRunStore.setState({ active: next });
    if (Date.now() - lastSave >= 3000) {
      lastSave = Date.now();
      void persist(next).catch(() => useRunStore.setState({
        error: 'Sauvegarde locale impossible. Vérifie l’espace disponible.',
      }));
    }
  }, 1000);
}

type RunState = {
  active: ActiveActivity | null; routeVersion: number; error: string | null; busy: boolean;
  restore: (userId: string) => Promise<boolean>;
  start: (userId: string, type: ActivityType, autoPause: boolean) => Promise<boolean>;
  pause: () => Promise<void>; resume: () => Promise<void>;
  finish: () => Promise<Activity | null>; dismissError: () => void;
};

export const useRunStore = create<RunState>((set, get) => ({
  active: null, routeVersion: 0, error: null, busy: false,
  dismissError: () => set({ error: null }),
  restore: async (userId) => {
    if (get().active?.userId === userId) return true;
    const saved = await loadActive(userId);
    if (!saved) return false;
    const { points, ...summary } = saved;
    trackBuffer = points ?? [];
    set({ active: { ...summary, state: 'paused', lastTickAt: Date.now() },
      routeVersion: trackBuffer.length });
    return true;
  },
  start: async (userId, activityType, autoPause) => {
    set({ busy: true, error: null });
    try {
      if (get().active?.userId === userId || await get().restore(userId)) return true;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Autorise la localisation pour enregistrer ta course.');
      if (!await Location.hasServicesEnabledAsync()) throw new Error('Active la localisation sur ton téléphone.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if ((position.coords.accuracy ?? 1000) > 50) {
        throw new Error('Signal GPS trop faible. Réessaie à l’extérieur.');
      }
      const now = Date.now();
      trackBuffer = [toPoint(position)];
      const value: ActiveActivity = {
        id: Crypto.randomUUID(), userId, activityType, startedAt: now,
        lastTickAt: now, lastObservationAt: position.timestamp,
        elapsedSeconds: 0, movingSeconds: 0, distanceMeters: 0,
        elevationGainMeters: 0, elevationLossMeters: 0,
        splits: [], state: 'running', autoPause, stationarySeconds: 0,
        recoverySeconds: 0, lastSplitMovingSeconds: 0, discardNextLocation: false,
      };
      await persist(value);
      set({ active: value, routeVersion: trackBuffer.length });
      await beginWatch();
      return true;
    } catch (error) {
      stopWatch();
      set({ error: error instanceof Error ? error.message : 'Impossible de démarrer.' });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  pause: async () => {
    const active = get().active;
    if (!active) return;
    stopWatch();
    const next: ActiveActivity = { ...tick(active, Date.now()), state: 'paused' };
    set({ active: next });
    try {
      await persist(next);
      set({ error: null });
    } catch {
      set({ error: 'Pause non sauvegardée. Réessaie.' });
    }
  },
  resume: async () => {
    const active = get().active;
    if (!active) return;
    try {
      const next: ActiveActivity = {
        ...active, state: 'running', lastTickAt: Date.now(),
        stationarySeconds: 0, recoverySeconds: 0, discardNextLocation: true,
      };
      await persist(next);
      set({ active: next, error: null });
      await beginWatch();
    } catch {
      stopWatch();
      set({ active: { ...active, state: 'paused' }, error: 'Reprise GPS impossible. Réessaie.' });
    }
  },
  finish: async () => {
    const active = get().active;
    if (!active) return null;
    set({ busy: true, error: null });
    try {
      stopWatch();
      await persistence;
      const last = tick(active, Date.now());
      const end = new Date();
      const activity: Activity = {
        id: last.id, userId: last.userId, activityType: last.activityType,
        startedAt: new Date(last.startedAt).toISOString(), endedAt: end.toISOString(),
        elapsedSeconds: last.elapsedSeconds, movingSeconds: last.movingSeconds,
        distanceMeters: last.distanceMeters, averagePaceSecPerKm: averagePace(last),
        elevationGainMeters: last.elevationGainMeters, elevationLossMeters: last.elevationLossMeters,
        visibility: 'private', title: `Course du ${end.toLocaleDateString('fr-FR')}`,
        hideRadiusMeters: 400, points: trackBuffer.slice(), splits: last.splits, syncState: 'pending',
      };
      await saveActivity(activity);
      await clearActive(last.userId);
      trackBuffer = [];
      set({ active: null, routeVersion: 0 });
      void syncPending(last.userId).catch(() => undefined);
      return activity;
    } catch {
      set({ error: 'La course reste sauvegardée localement. Réessaie de terminer.' });
      return null;
    } finally {
      set({ busy: false });
    }
  },
}));

AppState.addEventListener('change', (state) => {
  if (state === 'active') return;
  const active = useRunStore.getState().active;
  if (!active || active.state === 'paused') return;
  stopWatch();
  const paused: ActiveActivity = { ...tick(active, Date.now()), state: 'paused' };
  useRunStore.setState({ active: paused });
  void persist(paused).catch(() => useRunStore.setState({
    error: 'La pause n’a pas pu être sauvegardée. Vérifie l’espace disponible.',
  }));
});
