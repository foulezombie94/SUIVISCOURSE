import { useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/typography';
import { PlanPoster } from '@/features/programmes/plan-poster';
import { ProgrammeSessionCard } from '@/features/programmes/session-card';
import { trainingPlans, findTrainingPlan, weekFocus, type PlanSession } from '@/features/programmes/plans';
import { currentProgrammeWeek, programmeDay } from '@/features/programmes/programme-state';
import { useProgramme } from '@/features/programmes/use-programme';
import { useRunStore } from '@/store/run-store';
import { Button, ButtonText } from '@/components/ui/button';

const ink = '#000000';
const muted = '#6C6C6C';
const categories = ['Tout', 'Débuter', '5 km', '10 km', 'Semi'] as const;

export default function Programme() {
  const { query, mutation } = useProgramme();
  const activeSessionId = useRunStore((state) => state.active?.workout?.sessionId);
  const [selection, setSelection] = useState<{ key: string; pane: 'plan' | 'catalogue'; week: number } | null>(null);
  const [category, setCategory] = useState<string>('Tout');
  const planId = query.data?.planId;
  const startedOn = query.data?.startedOn;
  const activePlan = findTrainingPlan(planId);
  const completed = query.data?.completed ?? [];
  const selectionKey = `${planId ?? ''}:${startedOn ?? ''}`;
  const currentWeek = activePlan && query.data ? currentProgrammeWeek(query.data, activePlan.weeks) : 1;
  const pane = selection?.key === selectionKey ? selection.pane : activePlan ? 'plan' : 'catalogue';
  const week = selection?.key === selectionKey ? selection.week : currentWeek;
  const setPane = (nextPane: 'plan' | 'catalogue') => setSelection({ key: selectionKey, pane: nextPane, week });
  const setWeek = (nextWeek: number) => setSelection({ key: selectionKey, pane, week: nextWeek });
  const visiblePlans = trainingPlans.filter((plan) => category === 'Tout' || plan.category === category);
  const sessions = activePlan?.sessions.filter((session) => session.week === week) ?? [];
  const next = activePlan?.sessions.find((session) => !completed.includes(session.id));
  const progress = activePlan ? Math.round(completed.length / activePlan.sessions.length * 100) : 0;
  function openSession(session: PlanSession) {
    router.push({ pathname: '/programme/session', params: { plan: planId, week: String(session.week), ordinal: String(session.ordinal) } });
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
    <StatusBar style="dark" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 115, gap: 23 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 5 }}>
        <View style={{ gap: 5 }}>
          <Text style={{ color: ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 }}>Programme</Text>
          <Text style={{ color: muted, fontSize: 13 }}>Un objectif. Des séances. Ta progression.</Text>
        </View>
        <View style={{ width: 43, height: 43, borderRadius: 22, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={ink} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ECECEC', gap: 25 }}>
        {([{ key: 'plan', label: 'Mon plan' }, { key: 'catalogue', label: 'Découvrir' }] as const).map((item) =>
          <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: pane === item.key }}
            onPress={() => setPane(item.key)} style={{ paddingTop: 4, paddingBottom: 13,
              borderBottomWidth: 3, borderBottomColor: pane === item.key ? ink : 'transparent' }}>
            <Text style={{ color: pane === item.key ? ink : muted, fontSize: 16, fontWeight: '700' }}>{item.label}</Text>
          </Pressable>)}
      </View>
      {query.isPending ? <ActivityIndicator color={ink} /> : null}
      {query.isError ? <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
        <Text style={{ color: ink, fontSize: 13 }}>La progression est indisponible. Appuie pour réessayer.</Text>
      </Pressable> : null}
      {activeSessionId ? <Button onPress={() => router.push('/run/active')}
        style={{ backgroundColor: '#B9F532', borderRadius: 18, padding: 18, minHeight: 58,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <MaterialCommunityIcons name="run-fast" size={23} color={ink} />
        <ButtonText style={{ color: ink, fontSize: 14, fontWeight: '700' }}>Revenir à ma séance en cours</ButtonText>
        <MaterialCommunityIcons name="arrow-right" size={20} color={ink} />
      </Button> : null}

      {pane === 'catalogue' ? <>
        <View style={{ gap: 8 }}>
          <Text style={{ color: ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.7 }}>Quel sera ton prochain défi ?</Text>
          <Text style={{ color: muted, fontSize: 13, lineHeight: 20 }}>Choisis une distance et vérifie les prérequis avant de commencer.</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
          {categories.map((item) => <Pressable key={item} accessibilityRole="button"
            accessibilityState={{ selected: category === item }} onPress={() => setCategory(item)}
            style={{ borderRadius: 21, paddingHorizontal: 18, height: 41, justifyContent: 'center',
              backgroundColor: category === item ? ink : '#F5F5F5' }}>
            <Text style={{ color: category === item ? '#FFFFFF' : ink, fontWeight: '600', fontSize: 13 }}>{item}</Text>
          </Pressable>)}
        </ScrollView>
        {visiblePlans.map((plan) => <View key={plan.id} style={{ gap: 10 }}>
          <PlanPoster plan={plan} compact={plan.id !== 'start'}
            onPress={() => router.push({ pathname: '/programme/[id]', params: { id: plan.id } })} />
          <Text style={{ color: muted, fontSize: 13, lineHeight: 19, paddingHorizontal: 3 }}>{plan.subtitle}</Text>
          {planId === plan.id ? <Text style={{ color: ink, fontSize: 11, fontWeight: '700', paddingHorizontal: 3 }}>TON PROGRAMME ACTUEL</Text> : null}
        </View>)}
        <Text style={{ color: muted, fontSize: 11, lineHeight: 17 }}>Plans Élan généraux : ils ne remplacent pas un accompagnement individualisé. Tu peux répéter une semaine ou alléger une séance selon tes sensations.</Text>
      </> : activePlan && startedOn ? <>
        <Pressable accessibilityRole="button" accessibilityLabel="Voir mon programme"
          onPress={() => router.push({ pathname: '/programme/[id]', params: { id: activePlan.id } })}
          style={{ backgroundColor: ink, borderRadius: 23, padding: 22, gap: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: activePlan.color, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>MON OBJECTIF · {activePlan.category.toUpperCase()}</Text>
            <MaterialCommunityIcons name="arrow-top-right" size={20} color="#FFFFFF" />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 27, fontWeight: '800', letterSpacing: -0.8 }}>{activePlan.title}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#C6C6C6', fontSize: 12 }}>{completed.length} / {activePlan.sessions.length} séances cochées</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>{progress}%</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: activePlan.sessions.length, now: completed.length }}
            style={{ height: 7, borderRadius: 4, backgroundColor: '#383838', overflow: 'hidden' }}>
            <View style={{ height: 7, borderRadius: 4, backgroundColor: activePlan.color, width: `${progress}%` }} />
          </View>
        </Pressable>
        {next ? <Pressable accessibilityRole="button" onPress={() => openSession(next)}
          style={{ backgroundColor: '#B9F532', borderRadius: 18, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <MaterialCommunityIcons name="play-circle-outline" size={26} color={ink} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: ink, fontSize: 15, fontWeight: '700' }}>Prochaine séance</Text>
            <Text style={{ color: ink, fontSize: 11 }}>Semaine {next.week} · {next.title}</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color={ink} />
        </Pressable> : <View style={{ backgroundColor: '#B9F532', borderRadius: 18, padding: 18, flexDirection: 'row', gap: 10 }}>
          <MaterialCommunityIcons name="check-decagram-outline" size={24} color={ink} />
          <Text style={{ color: ink, fontSize: 17, fontWeight: '700' }}>Programme terminé !</Text>
        </View>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Semaine précédente" disabled={week <= 1}
            onPress={() => setWeek(week - 1)} style={{ width: 44, height: 44, justifyContent: 'center', opacity: week <= 1 ? 0.2 : 1 }}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={ink} />
          </Pressable>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: ink, fontSize: 20, fontWeight: '700' }}>Semaine {week} / {activePlan.weeks}</Text>
            <Text style={{ color: muted, fontSize: 11 }}>{weekFocus(activePlan, week)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Semaine suivante" disabled={week >= activePlan.weeks}
            onPress={() => setWeek(week + 1)} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end', opacity: week >= activePlan.weeks ? 0.2 : 1 }}>
            <MaterialCommunityIcons name="chevron-right" size={28} color={ink} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: 7 }, (_, offset) => {
            const date = programmeDay(startedOn, (week - 1) * 7 + offset);
            const planned = sessions.find((session) => session.dayOffset === offset);
            const done = planned != null && completed.includes(planned.id);
            return <View key={offset} style={{ flex: 1, alignItems: 'center', gap: 8, paddingVertical: 12,
              backgroundColor: planned ? '#F2F8E6' : '#F7F7F7', borderRadius: 15 }}>
              <Text style={{ color: muted, fontSize: 9, textTransform: 'uppercase' }}>{date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2)}</Text>
              <Text style={{ color: ink, fontSize: 18, fontWeight: '700' }}>{date.getDate()}</Text>
              <MaterialCommunityIcons name={done ? 'check' : planned ? 'run-fast' : 'minus'} size={13} color={planned ? ink : '#B2B2B2'} />
            </View>;
          })}
        </View>
        {sessions.map((session) => <ProgrammeSessionCard key={session.id} session={session}
          inProgress={session.id === activeSessionId}
          done={completed.includes(session.id)} date={programmeDay(startedOn, (week - 1) * 7 + session.dayOffset)}
          onPress={() => openSession(session)} disabled={mutation.isPending || query.isError}
          onToggle={() => mutation.mutate({ type: 'toggle', sessionId: session.id })} />)}
        <View style={{ flexDirection: 'row', gap: 10, padding: 17, borderRadius: 18, backgroundColor: '#F5F5F5' }}>
          <MaterialCommunityIcons name="weather-night" size={20} color={ink} />
          <Text style={{ color: muted, fontSize: 12, lineHeight: 18, flex: 1 }}>Les jours sans séance sont des jours de récupération. Les séances guidées se valident après tous les blocs. Tu peux aussi cocher une séance réalisée sans le suivi.</Text>
        </View>
      </> : !query.isPending ? <View style={{ alignItems: 'center', paddingVertical: 35, gap: 17 }}>
        <MaterialCommunityIcons name="clipboard-check-outline" size={47} color={ink} />
        <Text style={{ color: ink, fontSize: 23, fontWeight: '700' }}>Ton prochain objectif commence ici.</Text>
        <Text style={{ color: muted, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>Choisis un programme pour retrouver tes semaines et tes séances dans cet onglet.</Text>
        <Pressable accessibilityRole="button" onPress={() => setPane('catalogue')}
          style={{ backgroundColor: ink, borderRadius: 24, paddingHorizontal: 24, height: 49, justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Découvrir les programmes</Text>
        </Pressable>
      </View> : null}
    </ScrollView>
  </SafeAreaView>;
}
