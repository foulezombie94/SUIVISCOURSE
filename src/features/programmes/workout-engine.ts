import type { ActiveActivity } from '@/types/domain';
import { trainingPlans, type PlanSession, type TrainingPlan } from './plans';
import type { GuidedWorkout, WorkoutResult, WorkoutStep } from './workout-types';

export function findPlanSession(id: string) {
  for (const plan of trainingPlans) {
    const session = plan.sessions.find((item) => item.id === id);
    if (session) return { plan, session };
  }
  return null;
}

export function createGuidedWorkout(plan: TrainingPlan, session: PlanSession,
  programmeStartedOn: string | null): GuidedWorkout {
  const steps: WorkoutStep[] = [];
  session.stages.forEach((stage, stageIndex) => {
    const phase = stageIndex === 0 ? 'warmup' : stageIndex === session.stages.length - 1 ? 'cooldown' : 'work';
    const repetitions = stage.repetitions ?? 1;
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      steps.push({ phase, stageIndex, label: stage.label, instruction: stage.instruction,
        targetSeconds: stage.seconds, targetMeters: stage.meters,
        ...(stage.repetitions ? { repetition, repetitions } : {}) });
      if (stage.recoverySeconds) steps.push({ phase: 'recovery', stageIndex,
        label: session.kind === 'walk-run' ? 'Marche de récupération' : 'Footing de récupération',
        instruction: session.kind === 'walk-run' ? 'Marche tranquillement et retrouve une respiration confortable.'
          : 'Trottine à une allure très facile pour récupérer.',
        targetSeconds: stage.recoverySeconds, repetition, repetitions });
    }
  });
  return { planId: plan.id, sessionId: session.id, planTitle: plan.title, sessionTitle: session.title,
    week: session.week, ordinal: session.ordinal, programmeStartedOn,
    steps, index: 0, startedAtSeconds: 0, startedAtMeters: 0, results: [], finished: false };
}

export function workoutMetrics(active: Pick<ActiveActivity, 'elapsedSeconds' | 'distanceMeters'>, workout: GuidedWorkout) {
  const step = workout.steps[workout.index];
  const seconds = Math.max(0, active.elapsedSeconds - workout.startedAtSeconds);
  const meters = Math.max(0, active.distanceMeters - workout.startedAtMeters);
  const ratio = step?.targetMeters ? meters / step.targetMeters : step?.targetSeconds ? seconds / step.targetSeconds : 0;
  return { seconds, meters, progress: Math.min(1, ratio), ready: ratio >= 1,
    remainingSeconds: Math.max(0, (step?.targetSeconds ?? 0) - seconds),
    remainingMeters: Math.max(0, (step?.targetMeters ?? 0) - meters) };
}

function resultAt(active: ActiveActivity, workout: GuidedWorkout, seconds?: number): WorkoutResult {
  const metrics = workoutMetrics(active, workout);
  return { index: workout.index, seconds: seconds ?? metrics.seconds, meters: metrics.meters, fulfilled: metrics.ready };
}

// Only work/recovery transitions are automatic. Warmup waits for the runner's explicit start.
export function advanceGuidedWorkout(active: ActiveActivity): ActiveActivity {
  if (!active.workout || active.state !== 'running') return active;
  let workout = active.workout;
  while (workout.index < workout.steps.length - 1) {
    const step = workout.steps[workout.index];
    if (step.phase === 'warmup' || step.phase === 'cooldown' || !workoutMetrics(active, workout).ready) break;
    const endSeconds = step.targetSeconds ? workout.startedAtSeconds + step.targetSeconds : active.elapsedSeconds;
    workout = { ...workout, index: workout.index + 1,
      results: [...workout.results, resultAt(active, workout, endSeconds - workout.startedAtSeconds)],
      startedAtSeconds: endSeconds, startedAtMeters: active.distanceMeters };
  }
  return workout === active.workout ? active : { ...active, workout };
}

export function confirmWarmup(active: ActiveActivity): ActiveActivity {
  const workout = active.workout;
  if (!workout || active.state !== 'running' || workout.steps[workout.index]?.phase !== 'warmup'
    || !workoutMetrics(active, workout).ready) return active;
  return { ...active, workout: { ...workout, index: workout.index + 1,
    results: [...workout.results, resultAt(active, workout)],
    startedAtSeconds: active.elapsedSeconds, startedAtMeters: active.distanceMeters } };
}

export function finishGuidedWorkout(active: ActiveActivity): GuidedWorkout | undefined {
  if (!active.workout) return undefined;
  const workout = active.workout;
  const results = [...workout.results, resultAt(active, workout)];
  return { ...workout, results,
    finished: results.length === workout.steps.length && results.every((result) => result.fulfilled) };
}
