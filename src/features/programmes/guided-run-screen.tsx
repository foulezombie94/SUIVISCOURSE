import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/typography';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { getTrackPoints, useRunStore } from '@/store/run-store';
import { fonts } from '@/constants/typography';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import { WorkoutMap } from './workout-map';
import { workoutMetrics } from './workout-engine';
import type { WorkoutPhase } from './workout-types';

const ink = '#0C1116';
const accent = '#B9F532';
const phases: Record<WorkoutPhase, { label: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  warmup: { label: 'Échauffement', color: accent, icon: 'walk' },
  work: { label: 'Séance', color: accent, icon: 'run-fast' },
  recovery: { label: 'Récupération', color: '#BEDFFF', icon: 'weather-windy' },
  cooldown: { label: 'Retour au calme', color: '#DCD1FA', icon: 'weather-night' },
};

function LiveMetric({ value, label }: { value: string; label: string }) {
  return <View style={{ flex: 1, gap: 5, alignItems: 'center' }}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: '#FFFFFF', fontSize: 22,
      fontFamily: fonts.monoBold, fontVariant: ['tabular-nums'] }}>{value}</Text>
    <Text style={{ color: '#A9B4BC', fontSize: 10 }}>{label}</Text>
  </View>;
}

function ScreenAwake() {
  useKeepAwake('guided-run', { suppressDeactivateWarnings: true });
  return null;
}

export function GuidedRunScreen() {
  const { active, pause, resume, finish, advanceWorkout, busy, error } = useRunStore();
  const cache = useQueryClient();
  const { height } = useWindowDimensions();
  const [following, setFollowing] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const hold = useSharedValue(0);
  const stopStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + hold.value * 0.45 }] }));
  const workout = active?.workout;
  const step = workout?.steps[workout.index];
  const stepIndex = workout?.index;
  useEffect(() => {
    if (stepIndex == null) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [stepIndex]);
  const finishSession = useCallback(() => {
    if (finishingRef.current || useRunStore.getState().busy) return;
    finishingRef.current = true;
    setFinishing(true);
    void (async () => {
      const saved = await finish();
      if (!saved) {
        finishingRef.current = false;
        setFinishing(false);
        hold.set(withSpring(0));
        return;
      }
      cache.setQueryData(['activity', saved.userId, saved.id], saved);
      void cache.invalidateQueries({ queryKey: ['running-programme', saved.userId] });
      void cache.invalidateQueries({ queryKey: ['activities', saved.userId] });
      void cache.invalidateQueries({ queryKey: ['history', saved.userId] });
      router.replace({ pathname: '/run/summary', params: { id: saved.id } });
    })();
  }, [cache, finish, hold]);
  function startHold() {
    if (busy || finishingRef.current) return;
    cancelAnimation(hold);
    hold.set(withTiming(1, { duration: 1500 }, (completed) => { if (completed) runOnJS(finishSession)(); }));
  }
  function cancelHold() {
    if (finishingRef.current) return;
    cancelAnimation(hold);
    hold.set(withSpring(0));
  }
  if (!active || !workout || !step) return finishing ? <View style={{ flex: 1, backgroundColor: ink }} />
    : <Redirect href="/(tabs)/programme" />;
  const phase = phases[step.phase];
  const metrics = workoutMetrics(active, workout);
  const paused = active.state === 'paused';
  const stepPace = metrics.meters >= 50 ? metrics.seconds / metrics.meters * 1000 : null;
  const next = workout.steps[workout.index + 1];
  const gpsFresh = !paused && active.lastTickAt - active.lastObservationAt < 15000;
  const progress = (workout.results.length + metrics.progress) / workout.steps.length * 100;
  const timer = step.targetMeters ? formatKm(metrics.remainingMeters) : formatDuration(Math.ceil(metrics.remainingSeconds));
  return <SafeAreaView style={{ flex: 1, backgroundColor: ink }} edges={['top', 'bottom']}>
    {!paused ? <ScreenAwake /> : null}
    <StatusBar style="light" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Button accessibilityLabel="Retour aux programmes, la séance reste active" onPress={() => router.replace('/(tabs)/programme')}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#222B32', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="chevron-left" size={25} color="#FFFFFF" />
        </Button>
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{workout.planTitle}</Text>
          <Text style={{ color: '#A9B4BC', fontSize: 10 }}>Semaine {workout.week} · Séance {workout.ordinal}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: gpsFresh ? accent : '#F5C5AA' }} />
          <Text style={{ color: gpsFresh ? accent : '#F5C5AA', fontSize: 10, fontWeight: '700' }}>
            {paused ? 'PAUSE' : gpsFresh ? 'GPS' : 'GPS FAIBLE'}</Text>
        </View>
      </View>
      <View style={{ height: Math.max(190, Math.min(270, height * 0.29)), borderRadius: 24, overflow: 'hidden', backgroundColor: '#192229' }}>
        <WorkoutMap points={getTrackPoints()} observation={active.lastObservationAt} following={following} onPan={() => setFollowing(false)} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 13, left: 13, backgroundColor: ink,
          paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, flexDirection: 'row', gap: 7, alignItems: 'center' }}>
          <MaterialCommunityIcons name={phase.icon} size={15} color={phase.color} />
          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>{phase.label}</Text>
        </View>
        <Button accessibilityLabel="Recentrer la carte sur ma position" onPress={() => setFollowing(true)}
          style={{ position: 'absolute', right: 13, bottom: 13, width: 43, height: 43,
            borderRadius: 22, backgroundColor: ink, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="crosshairs-gps" size={23} color={following ? accent : '#FFFFFF'} />
        </Button>
      </View>
      <View style={{ backgroundColor: '#192229', borderRadius: 24, padding: 22, gap: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: phase.color, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>{phase.label.toUpperCase()}</Text>
          <Text style={{ color: '#A9B4BC', fontSize: 11 }}>
            {step.repetitions ? `Répétition ${step.repetition} / ${step.repetitions}` : `Étape ${workout.index + 1} / ${workout.steps.length}`}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: '#FFFFFF', fontSize: 64,
            lineHeight: 80, fontFamily: fonts.monoBold, fontVariant: ['tabular-nums'], letterSpacing: -2 }}>{timer}</Text>
          <Text style={{ color: '#A9B4BC', fontSize: 11 }}>{paused ? 'Compteur en pause'
            : metrics.ready ? step.phase === 'warmup' ? 'Prêt à commencer ta séance' : 'Objectif de cette étape atteint'
              : step.targetMeters ? 'kilomètres restants pour ce bloc' : 'temps restant pour ce bloc'}</Text>
        </View>
        <Progress value={metrics.progress * 100} accessibilityLabel={`Progression : ${phase.label}`}
          style={{ height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: '#354047' }}>
          <ProgressFilledTrack style={{ backgroundColor: phase.color, borderRadius: 4 }} />
        </Progress>
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{step.label}</Text>
        <Text style={{ color: '#A9B4BC', fontSize: 12, lineHeight: 19 }}>{step.instruction}</Text>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#354047', paddingTop: 15, gap: 8 }}>
          <LiveMetric value={`${formatKm(metrics.meters)} km`} label="Distance du bloc" />
          <LiveMetric value={formatDuration(metrics.seconds)} label="Temps du bloc" />
          <LiveMetric value={formatPace(stepPace)} label="Allure · min/km" />
        </View>
      </View>
      {step.phase === 'warmup' ? <Button isDisabled={!metrics.ready || paused || busy || finishing}
        onPress={() => void advanceWorkout()} style={{ minHeight: 54, borderRadius: 18, backgroundColor: accent,
          alignItems: 'center', justifyContent: 'center', opacity: !metrics.ready || paused ? 0.45 : 1, padding: 12 }}>
        <ButtonText style={{ color: ink, fontSize: 15, fontWeight: '800' }}>
          {metrics.ready ? 'Commencer la séance' : 'Échauffement en cours'}</ButtonText>
      </Button> : step.phase === 'cooldown' && metrics.ready ? <Button isDisabled={busy || finishing || paused}
        onPress={finishSession} style={{ minHeight: 54, borderRadius: 18, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
        <ButtonText style={{ color: ink, fontSize: 15, fontWeight: '800' }}>Terminer et valider ma séance</ButtonText>
      </Button> : null}
      {next ? <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 3 }}>
        <MaterialCommunityIcons name="arrow-right" size={21} color={phase.color} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#A9B4BC', fontSize: 10 }}>{step.phase === 'warmup' ? 'APRÈS TON ÉCHAUFFEMENT' : 'ENSUITE · PASSAGE AUTOMATIQUE'}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{next.label} · {next.targetMeters
            ? `${formatKm(next.targetMeters)} km` : formatDuration(next.targetSeconds ?? 0)}</Text>
        </View>
      </View> : null}
      <View style={{ gap: 10, paddingVertical: 5 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#A9B4BC', fontSize: 11 }}>Progression des blocs</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{Math.round(progress)}%</Text>
        </View>
        <Progress value={progress} accessibilityLabel="Progression des blocs de la séance"
          style={{ height: 5, borderRadius: 3, backgroundColor: '#354047', overflow: 'hidden' }}>
          <ProgressFilledTrack style={{ backgroundColor: accent, borderRadius: 3 }} />
        </Progress>
        <Text style={{ color: '#A9B4BC', fontSize: 11 }}>Sortie totale · {formatKm(active.distanceMeters)} km · {formatDuration(active.elapsedSeconds)}</Text>
      </View>
      {error ? <Text selectable style={{ color: '#F5C5AA', fontSize: 12, lineHeight: 18 }}>{error}</Text> : null}
    </ScrollView>
    <View style={{ padding: 17, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: '#283139',
      flexDirection: 'row', alignItems: 'center', gap: 24 }}>
      <Button isDisabled={busy || finishing} onPress={() => void (paused ? resume() : pause())}
        style={{ flex: 1, minHeight: 54, borderRadius: 27, backgroundColor: accent,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <MaterialCommunityIcons name={paused ? 'play' : 'pause'} size={25} color={ink} />
        <ButtonText style={{ color: ink, fontSize: 14, fontWeight: '800' }}>{paused ? 'Reprendre' : 'Pause'}</ButtonText>
      </Button>
      <Animated.View style={[{ width: 54, height: 54 }, stopStyle]}>
        <Button isDisabled={busy || finishing} accessibilityLabel="Maintenir pour arrêter la séance"
          accessibilityHint="Maintiens une seconde et demie. Arrêter avant la fin des blocs ne valide pas la séance."
          onPressIn={startHold} onPressOut={cancelHold}
          style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#FF493D', alignItems: 'center', justifyContent: 'center' }}>
          {finishing ? <ButtonSpinner color="#FFFFFF" /> : <MaterialCommunityIcons name="stop" size={24} color="#FFFFFF" />}
        </Button>
      </Animated.View>
    </View>
  </SafeAreaView>;
}
