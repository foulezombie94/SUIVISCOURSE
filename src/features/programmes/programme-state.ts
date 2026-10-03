import AsyncStorage from '@react-native-async-storage/async-storage';
import { findTrainingPlan } from './plans';
import type { GuidedWorkout } from './workout-types';

export type ProgrammeState = { planId: string; startedOn: string; completed: string[] };
export type ProgrammeAction = { type: 'start'; planId: string } | { type: 'toggle'; sessionId: string };
const key = (userId: string) => `running-programme:${userId}`;

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function programmeDay(startedOn: string, offset: number): Date {
  const day = new Date(`${startedOn}T12:00:00`);
  day.setDate(day.getDate() + offset);
  return day;
}
export function currentProgrammeWeek(state: ProgrammeState, weeks: number): number {
  const today = new Date();
  const start = programmeDay(state.startedOn, 0);
  const difference = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.min(weeks, Math.max(1, Math.floor(difference / 604800000) + 1));
}
export async function loadProgramme(userId: string): Promise<ProgrammeState | null> {
  if (!userId) return null;
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return null;
  const value = JSON.parse(raw) as ProgrammeState;
  const plan = findTrainingPlan(value.planId);
  if (!plan || !Array.isArray(value.completed) || !/^\d{4}-\d{2}-\d{2}$/.test(value.startedOn)
    || !Number.isFinite(programmeDay(value.startedOn, 0).getTime())) throw new Error('Programme illisible');
  const validIds = new Set(plan.sessions.map((session) => session.id));
  return { ...value, completed: [...new Set(value.completed.filter((id) => validIds.has(id)))] };
}
export async function updateProgramme(userId: string, action: ProgrammeAction): Promise<ProgrammeState> {
  if (!userId) throw new Error('Compte requis');
  let next: ProgrammeState;
  if (action.type === 'start') {
    if (!findTrainingPlan(action.planId)) throw new Error('Programme inconnu');
    next = { planId: action.planId, startedOn: localDateKey(), completed: [] };
  } else {
    const previous = await loadProgramme(userId);
    if (!previous || !findTrainingPlan(previous.planId)?.sessions.some((session) => session.id === action.sessionId)) {
      throw new Error('Séance hors programme');
    }
    next = { ...previous, completed: previous.completed.includes(action.sessionId)
      ? previous.completed.filter((id) => id !== action.sessionId) : [...previous.completed, action.sessionId] };
  }
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}

export async function completeProgrammeWorkout(userId: string, workout: GuidedWorkout) {
  if (!workout.finished || !workout.programmeStartedOn) return;
  const current = await loadProgramme(userId);
  if (!current || current.planId !== workout.planId || current.startedOn !== workout.programmeStartedOn
    || current.completed.includes(workout.sessionId)) return;
  if (!findTrainingPlan(current.planId)?.sessions.some((session) => session.id === workout.sessionId)) return;
  await AsyncStorage.setItem(key(userId), JSON.stringify({ ...current, completed: [...current.completed, workout.sessionId] }));
}
