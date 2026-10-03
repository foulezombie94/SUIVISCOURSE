import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/typography';
import { findTrainingPlan, sessionKinds, sessionMeasure } from '@/features/programmes/plans';
import { useProgramme } from '@/features/programmes/use-programme';
import { useRunStore } from '@/store/run-store';
import { formatDuration } from '@/utils/format';
import { Button, ButtonText } from '@/components/ui/button';

export default function ProgrammeWorkout() {
  const params = useLocalSearchParams<{ plan: string; week: string; ordinal: string }>();
  const plan = findTrainingPlan(params.plan);
  const workout = plan?.sessions.find((session) => session.week === Number(params.week)
    && session.ordinal === Number(params.ordinal));
  const { query, mutation } = useProgramme();
  const active = useRunStore((state) => state.active);
  const enrolled = query.data?.planId === plan?.id;
  const done = workout != null && !!query.data?.completed.includes(workout.id);
  function launch() {
    if (active) router.push('/run/active');
    else if (!enrolled && plan) router.push({ pathname: '/programme/[id]', params: { id: plan.id } });
    else if (workout) router.push({ pathname: '/run/countdown', params: {
      type: 'running', autoPause: '0', workout: workout.id,
    } });
  }
  const kind = workout ? sessionKinds[workout.kind] : null;
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, gap: 24 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour au programme" onPress={() => router.back()}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#000000" />
      </Pressable>
      {!workout || !plan || !kind ? <Text style={{ color: '#000000', fontSize: 22 }}>Séance introuvable</Text> : <>
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#6C6C6C', fontSize: 11, fontWeight: '600' }}>SEMAINE {workout.week} · SÉANCE {workout.ordinal}</Text>
          <Text style={{ color: '#000000', fontSize: 34, fontWeight: '800', letterSpacing: -1 }}>{workout.title}</Text>
          <Text style={{ color: '#6C6C6C', fontSize: 13 }}>{plan.title}</Text>
        </View>
        <View style={{ backgroundColor: kind.color, borderRadius: 23, padding: 23, gap: 14 }}>
          <MaterialCommunityIcons name={kind.icon} size={30} color="#000000" />
          <Text style={{ color: '#000000', fontSize: 30, fontWeight: '800', letterSpacing: -1 }}>{sessionMeasure(workout)}</Text>
          <Text style={{ color: '#000000', fontSize: 13, lineHeight: 20 }}>{workout.effort}</Text>
        </View>
        <View style={{ gap: 18 }}>
          <Text style={{ color: '#000000', fontSize: 23, fontWeight: '700' }}>Déroulé de la séance</Text>
          {workout.stages.map((stage, index) => <View key={`${stage.label}:${index}`} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 34, alignItems: 'center' }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{index + 1}</Text>
              </View>
              {index < workout.stages.length - 1 ? <View style={{ width: 1, backgroundColor: '#DDDDDD', flex: 1, minHeight: 26, marginTop: 10 }} /> : null}
            </View>
            <View style={{ flex: 1, gap: 8, paddingBottom: 15 }}>
              <Text style={{ color: '#000000', fontSize: 16, fontWeight: '700' }}>{stage.label}</Text>
              <Text style={{ color: '#000000', fontSize: 14, fontWeight: '600' }}>
                {stage.repetitions ? `${stage.repetitions} × ` : ''}
                {stage.meters != null ? `${(stage.meters / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`
                  : formatDuration(stage.seconds ?? 0)}
                {stage.recoverySeconds ? ` / ${formatDuration(stage.recoverySeconds)} de récupération` : ''}
              </Text>
              <Text style={{ color: '#6C6C6C', fontSize: 13, lineHeight: 20 }}>{stage.instruction}</Text>
            </View>
          </View>)}
        </View>
        <View style={{ backgroundColor: '#F5F5F5', borderRadius: 18, padding: 18, gap: 9 }}>
          <Text style={{ color: '#000000', fontSize: 14, fontWeight: '700' }}>Pendant la sortie</Text>
          <Text style={{ color: '#6C6C6C', fontSize: 12, lineHeight: 19 }}>Commence par l’échauffement prévu ici, avec carte et mesures GPS en direct. Une fois terminé, lance le bloc principal. Les répétitions et récupérations s’enchaînent automatiquement, jusqu’au retour au calme.</Text>
        </View>
        {enrolled ? <Pressable accessibilityRole="button" disabled={mutation.isPending || query.isError}
          onPress={() => mutation.mutate({ type: 'toggle', sessionId: workout.id })}
          style={{ backgroundColor: '#F5F5F5', borderRadius: 18, minHeight: 52, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 9 }}>
          {mutation.isPending ? <ActivityIndicator color="#000000" /> : <>
            <MaterialCommunityIcons name={done ? 'check-circle' : 'checkbox-blank-circle-outline'} size={22} color="#000000" />
            <Text style={{ color: '#000000', fontSize: 14, fontWeight: '700' }}>{done ? 'Marquer comme à faire' : 'Marquer comme faite'}</Text>
          </>}
        </Pressable> : null}
      </>}
    </ScrollView>
    {workout ? <View style={{ padding: 24, paddingTop: 13, paddingBottom: 13, borderTopWidth: 1, borderTopColor: '#EEEEEE' }}>
      <Button onPress={launch} isDisabled={!active && (query.isPending || query.isError)}
        style={{ backgroundColor: '#000000', borderRadius: 18, minHeight: 54, flexDirection: 'row', gap: 9,
          justifyContent: 'center', alignItems: 'center' }}>
        <MaterialCommunityIcons name={active ? 'arrow-right' : 'play'} size={22} color="#FFFFFF" />
        <ButtonText style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{active ? 'Revenir à la course en cours'
          : enrolled ? 'Lancer l’échauffement' : 'Choisir ce programme'}</ButtonText>
      </Button>
    </View> : null}
  </SafeAreaView>;
}
