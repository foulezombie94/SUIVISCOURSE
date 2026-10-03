export type WorkoutPhase = 'warmup' | 'work' | 'recovery' | 'cooldown';
export type WorkoutStep = {
  phase: WorkoutPhase; label: string; instruction: string; stageIndex: number;
  targetSeconds?: number; targetMeters?: number; repetition?: number; repetitions?: number;
};
export type WorkoutResult = { index: number; seconds: number; meters: number; fulfilled: boolean };
export type GuidedWorkout = {
  planId: string; sessionId: string; planTitle: string; sessionTitle: string;
  week: number; ordinal: number; programmeStartedOn: string | null;
  steps: WorkoutStep[]; index: number; startedAtSeconds: number; startedAtMeters: number;
  results: WorkoutResult[]; finished: boolean;
};
