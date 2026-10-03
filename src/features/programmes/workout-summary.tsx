import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/typography';
import { Button, ButtonText } from '@/components/ui/button';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { formatDuration, formatKm } from '@/utils/format';
import type { GuidedWorkout } from './workout-types';

export function WorkoutSummary({ workout }: { workout: GuidedWorkout }) {
  const groups = [...new Set(workout.steps.map((step) => step.stageIndex))].map((stageIndex) => {
    const steps = workout.steps.flatMap((step, index) => step.stageIndex === stageIndex ? [{ step, index }] : []);
    const results = workout.results.filter((result) => steps.some(({ index }) => result.index === index));
    return { label: steps[0].step.label, done: results.length === steps.length && results.every((result) => result.fulfilled),
      started: results.length > 0, seconds: results.reduce((total, result) => total + result.seconds, 0),
      meters: results.reduce((total, result) => total + result.meters, 0) };
  });
  const done = workout.results.filter((result) => result.fulfilled).length;
  return <View style={{ backgroundColor: '#192229', borderRadius: 24, padding: 22, gap: 18 }}>
    <View style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}>
      <MaterialCommunityIcons name={workout.finished ? 'check-decagram-outline' : 'clipboard-text-outline'} size={25} color="#B9F532" />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 18 }}>{workout.finished ? 'Séance accomplie' : 'Séance interrompue'}</Text>
        <Text style={{ color: '#A9B4BC', fontSize: 11 }}>{workout.planTitle} · Semaine {workout.week}</Text>
      </View>
    </View>
    <Text style={{ color: '#A9B4BC', fontSize: 12, lineHeight: 19 }}>{workout.finished
      ? 'Tous les blocs ont été réalisés. Ta séance et le détail de chaque étape sont enregistrés.'
      : 'Ta sortie GPS est sauvegardée. Les blocs restants ne sont pas validés dans le programme.'}</Text>
    <Progress value={done / workout.steps.length * 100} accessibilityLabel="Blocs réalisés"
      style={{ height: 6, backgroundColor: '#354047', borderRadius: 3, overflow: 'hidden' }}>
      <ProgressFilledTrack style={{ backgroundColor: '#B9F532', borderRadius: 3 }} />
    </Progress>
    {groups.map((group, index) => <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <MaterialCommunityIcons name={group.done ? 'check-circle' : group.started ? 'circle-half-full' : 'circle-outline'}
        color={group.done ? '#B9F532' : '#A9B4BC'} size={19} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{group.label}</Text>
        <Text style={{ color: '#A9B4BC', fontSize: 11 }}>{group.started
          ? `${formatDuration(group.seconds)} · ${formatKm(group.meters)} km${group.done ? '' : ' · partiel'}` : 'Non réalisé'}</Text>
      </View>
    </View>)}
    <Button onPress={() => router.replace('/(tabs)/programme')}
      style={{ minHeight: 47, borderRadius: 16, backgroundColor: '#B9F532', alignItems: 'center', justifyContent: 'center' }}>
      <ButtonText style={{ color: '#000000', fontWeight: '700', fontSize: 13 }}>Voir ma progression</ButtonText>
    </Button>
  </View>;
}
