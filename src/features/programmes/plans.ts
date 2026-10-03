export type SessionKind = 'walk-run' | 'easy' | 'intervals' | 'long' | 'race';
export type SessionStage = { label: string; seconds?: number; meters?: number; repetitions?: number;
  recoverySeconds?: number; instruction: string };
export type PlanSession = { id: string; week: number; ordinal: number; dayOffset: number;
  title: string; kind: SessionKind; effort: string; stages: SessionStage[];
  seconds: number | null; meters: number | null };
export type TrainingPlan = { id: string; title: string; subtitle: string; poster: string; unit: string;
  category: 'Débuter' | '5 km' | '10 km' | 'Semi'; weeks: number; level: string; color: string;
  prerequisite: string; description: string; sessions: PlanSession[] };

export const programmeSources = [
  { label: 'Nike · types de séances', url: 'https://www.nike.com/running/5k-training-plan' },
  { label: 'Runna · progression et récupération', url: 'https://www.runna.com/training/training-plans' },
  { label: 'NHS · débuter en course à pied', url: 'https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/' },
];
export const sessionKinds: Record<SessionKind, { label: string; color: string; icon: 'walk' | 'run-fast' | 'lightning-bolt-outline' | 'road-variant' | 'flag-checkered' }> = {
  'walk-run': { label: 'Course & marche', color: '#B9F532', icon: 'walk' },
  easy: { label: 'Endurance facile', color: '#B9F532', icon: 'run-fast' },
  intervals: { label: 'Variation d’allure', color: '#BEDFFF', icon: 'lightning-bolt-outline' },
  long: { label: 'Sortie longue', color: '#F5C5AA', icon: 'road-variant' },
  race: { label: 'Objectif final', color: '#DCD1FA', icon: 'flag-checkered' },
};

const minutes = (value: number) => value * 60;
const easyEffort = 'Facile · tu peux parler en phrases complètes.';
function session(planId: string, week: number, ordinal: number, kind: SessionKind,
  main: SessionStage[], warmupMinutes = 10): PlanSession {
  const stages: SessionStage[] = [
    { label: 'Échauffement', seconds: minutes(warmupMinutes),
      instruction: kind === 'walk-run' ? 'Marche tranquillement.' : 'Marche, puis trottine doucement.' },
    ...main,
    { label: 'Retour au calme', seconds: minutes(5), instruction: 'Ralentis progressivement, puis marche.' },
  ];
  const distance = main.find((stage) => stage.meters != null)?.meters ?? null;
  return { id: `${planId}:${week}:${ordinal}`, week, ordinal, dayOffset: [0, 2, 5][ordinal - 1],
    title: sessionKinds[kind].label, kind,
    effort: kind === 'intervals' ? 'Soutenu mais contrôlé · environ 6/10, sans sprint.' : easyEffort,
    stages, meters: distance,
    seconds: distance == null ? stages.reduce((total, stage) => total
      + ((stage.seconds ?? 0) + (stage.recoverySeconds ?? 0)) * (stage.repetitions ?? 1), 0) : null };
}
const steady = (duration: number): SessionStage[] => [{ label: 'Course facile', seconds: minutes(duration),
  instruction: 'Garde une allure régulière et une respiration confortable.' }];
const distanceStage = (meters: number): SessionStage[] => [{ label: 'Distance de la séance', meters,
  instruction: 'Cours à une allure facile. Tu peux marcher si nécessaire.' }];

// Original Élan schedules. References inform the workout structure, not a claimed coach endorsement.
const starterBlocks: SessionStage[][] = [
  [{ label: 'Course & marche', seconds: 60, recoverySeconds: 120, repetitions: 6, instruction: '1 min de course facile, puis 2 min de marche.' }],
  [{ label: 'Course & marche', seconds: 90, recoverySeconds: 90, repetitions: 6, instruction: '1 min 30 de course, puis 1 min 30 de marche.' }],
  [{ label: 'Course & marche', seconds: 120, recoverySeconds: 120, repetitions: 5, instruction: '2 min de course, puis 2 min de marche.' }],
  [{ label: 'Course & marche', seconds: 240, recoverySeconds: 120, repetitions: 4, instruction: '4 min de course, puis 2 min de marche.' }],
  [{ label: 'Course & marche', seconds: 360, recoverySeconds: 120, repetitions: 3, instruction: '6 min de course, puis 2 min de marche.' }],
  [{ label: 'Course & marche', seconds: 600, recoverySeconds: 180, repetitions: 2, instruction: '10 min de course, puis 3 min de marche.' }],
  [{ label: 'Premier bloc', seconds: 900, instruction: '15 min de course facile.' },
    { label: 'Marche', seconds: 180, instruction: '3 min pour récupérer.' },
    { label: 'Second bloc', seconds: 600, instruction: '10 min de course facile.' }],
  steady(25), steady(30),
];
const starterSessions = starterBlocks.flatMap((main, index) => [1, 2, 3]
  .map((ordinal) => session('start', index + 1, ordinal, index < 7 ? 'walk-run' : 'easy', main, 5)));

function distanceSessions(id: string, easyMinutes: number[], longMeters: number[], target: number): PlanSession[] {
  return easyMinutes.flatMap((duration, index) => {
    const week = index + 1;
    const final = week === easyMinutes.length;
    const recovery = week % 4 === 0 && !final;
    const tapered = week >= easyMinutes.length - 1;
    const repeats = tapered ? 4 : Math.min(6, 4 + Math.floor(index / 3));
    const effortSeconds = id === '5k' ? 60 : id === '10k' ? 120 : 180;
    const variation = { label: 'Variations contrôlées', seconds: effortSeconds,
      recoverySeconds: effortSeconds, repetitions: repeats,
      instruction: `${effortSeconds / 60} min à effort soutenu, puis autant de temps en footing facile.` };
    return [
      session(id, week, 1, 'easy', steady(duration)),
      session(id, week, 2, recovery || final ? 'easy' : 'intervals',
        recovery || final ? steady(Math.max(12, duration - 10)) : [variation]),
      session(id, week, 3, final ? 'race' : 'long', distanceStage(final ? target : longMeters[index])),
    ];
  });
}

export const trainingPlans: TrainingPlan[] = [
  { id: 'start', title: 'Mes premières foulées', subtitle: 'De la marche à 30 minutes de course.', poster: '30', unit: 'MIN',
    category: 'Débuter', weeks: 9, level: 'Débutant', color: '#B9F532',
    prerequisite: 'Pouvoir marcher 30 minutes confortablement. Aucune distance de course requise.',
    description: 'Trois sorties espacées par semaine. Les blocs de course s’allongent progressivement. Répète une semaine si elle reste difficile.',
    sessions: starterSessions },
  { id: '5k', title: 'Construire mon 5 km', subtitle: 'Endurance et variations d’allure.', poster: '5', unit: 'KM',
    category: '5 km', weeks: 8, level: 'Occasionnel', color: '#BEDFFF',
    prerequisite: 'Courir 30 minutes sans arrêt et avoir déjà une routine de 2 à 3 sorties par semaine.',
    description: 'Une course facile, une séance de variations et une sortie longue. Une semaine allégée et une réduction du volume avant l’objectif.',
    sessions: distanceSessions('5k', [20, 22, 25, 20, 28, 30, 22, 15],
      [4000, 4500, 5000, 4000, 5500, 6000, 4000, 5000], 5000) },
  { id: '10k', title: 'Aller jusqu’au 10 km', subtitle: 'Gagner en endurance, semaine après semaine.', poster: '10', unit: 'KM',
    category: '10 km', weeks: 10, level: 'Régulier', color: '#DCD1FA',
    prerequisite: 'Courir 5 km confortablement et pratiquer 3 sorties par semaine depuis plusieurs semaines.',
    description: 'Des sorties longues graduelles, du travail d’allure contrôlé et des semaines de récupération. Le volume diminue avant la dernière sortie.',
    sessions: distanceSessions('10k', [30, 32, 35, 28, 35, 38, 40, 30, 25, 20],
      [6000, 6500, 7000, 6000, 8000, 8500, 9000, 7500, 6000, 10000], 10000) },
  { id: 'half', title: 'Préparer mon semi', subtitle: 'Une base solide pour les 21,1 km.', poster: '21,1', unit: 'KM',
    category: 'Semi', weeks: 12, level: 'Confirmé', color: '#F5C5AA',
    prerequisite: 'Courir 10 km confortablement et avoir une routine de 3 sorties par semaine depuis au moins 6 semaines.',
    description: 'Les sorties longues sont centrales. Deux semaines allégées et une réduction finale du volume laissent une place à la récupération.',
    sessions: distanceSessions('half', [35, 38, 40, 30, 40, 42, 45, 35, 45, 40, 30, 20],
      [10000, 11000, 12000, 10000, 13000, 14000, 16000, 12000, 18000, 15000, 10000, 21097.5], 21097.5) },
];
export const findTrainingPlan = (id: string | undefined) => trainingPlans.find((plan) => plan.id === id);
export function sessionMeasure(session: PlanSession) {
  return session.meters == null ? `${Math.round((session.seconds ?? 0) / 60)} min`
    : `${(session.meters / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km + échauffement`;
}
export function weekFocus(plan: TrainingPlan, week: number) {
  if (week === plan.weeks) return 'Semaine objectif';
  if (plan.id !== 'start' && week === plan.weeks - 1) return 'Réduction du volume';
  if (plan.id !== 'start' && week % 4 === 0) return 'Semaine allégée';
  return week <= 2 ? 'Poser les bases' : 'Construire l’endurance';
}
