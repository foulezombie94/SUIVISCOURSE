import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/typography';
import { PlanPoster } from '@/features/programmes/plan-poster';
import { ProgrammeSessionCard } from '@/features/programmes/session-card';
import { findTrainingPlan, programmeSources, weekFocus } from '@/features/programmes/plans';
import { useProgramme } from '@/features/programmes/use-programme';

export default function ProgrammeOverview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = findTrainingPlan(id);
  const { query, mutation } = useProgramme();
  const [expandedWeek, setExpandedWeek] = useState(1);
  const selected = query.data?.planId === id;
  function choose() {
    if (!plan) return;
    if (selected) { router.replace('/(tabs)/programme'); return; }
    const start = () => mutation.mutate({ type: 'start', planId: plan.id }, {
      onSuccess: () => router.replace('/(tabs)/programme'),
    });
    if (query.data) Alert.alert('Changer de programme ?',
      'Le nouveau programme commencera aujourd’hui. La progression de ton programme actuel sera remplacée.',
      [{ text: 'Garder mon programme', style: 'cancel' }, { text: 'Changer', onPress: start }]);
    else start();
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour aux programmes" onPress={() => router.back()}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="#000000" />
      </Pressable>
    </View>
    {!plan ? <View style={{ padding: 24 }}><Text style={{ color: '#000000', fontSize: 22 }}>Programme introuvable</Text></View>
      : <>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingTop: 0, gap: 24 }}>
          <PlanPoster plan={plan} />
          <Text style={{ color: '#555555', fontSize: 14, lineHeight: 22 }}>{plan.description}</Text>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {[
              { icon: 'calendar-outline' as const, value: `${plan.weeks} semaines`, label: 'Durée' },
              { icon: 'run-fast' as const, value: '3 séances', label: 'Par semaine' },
              { icon: 'chart-bar' as const, value: plan.level, label: 'Niveau' },
            ].map((item) => <View key={item.label} style={{ flex: 1, padding: 12, backgroundColor: '#F5F5F5', borderRadius: 16, gap: 8 }}>
              <MaterialCommunityIcons name={item.icon} size={20} color="#000000" />
              <Text style={{ color: '#000000', fontSize: 12, fontWeight: '700' }}>{item.value}</Text>
              <Text style={{ color: '#707070', fontSize: 10 }}>{item.label}</Text>
            </View>)}
          </View>
          <View style={{ backgroundColor: '#000000', borderRadius: 20, padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <MaterialCommunityIcons name="check-circle-outline" size={21} color={plan.color} />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Avant de commencer</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 13, lineHeight: 21 }}>{plan.prerequisite}</Text>
          </View>
          <View style={{ gap: 12 }}>
            <Text style={{ color: '#000000', fontSize: 23, fontWeight: '800', letterSpacing: -0.5 }}>Le programme complet</Text>
            <Text style={{ color: '#707070', fontSize: 12 }}>Séances espacées et jours de récupération entre les sorties.</Text>
            {Array.from({ length: plan.weeks }, (_, index) => index + 1).map((week) => <View key={week} style={{ gap: 10 }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedWeek === week }}
                onPress={() => setExpandedWeek(expandedWeek === week ? 0 : week)}
                style={{ backgroundColor: '#F5F5F5', borderRadius: 17, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: '#000000', fontWeight: '700', fontSize: 16 }}>Semaine {week}</Text>
                  <Text style={{ color: '#707070', fontSize: 11 }}>{weekFocus(plan, week)}</Text>
                </View>
                <MaterialCommunityIcons name={expandedWeek === week ? 'chevron-up' : 'chevron-down'} size={22} color="#000000" />
              </Pressable>
              {expandedWeek === week ? plan.sessions.filter((session) => session.week === week).map((session) =>
                <ProgrammeSessionCard key={session.id} session={session}
                  done={selected && !!query.data?.completed.includes(session.id)}
                  onPress={() => router.push({ pathname: '/programme/session', params: {
                    plan: plan.id, week: String(session.week), ordinal: String(session.ordinal),
                  } })} />) : null}
            </View>)}
          </View>
          <View style={{ gap: 12, paddingVertical: 8 }}>
            <Text style={{ color: '#000000', fontSize: 18, fontWeight: '700' }}>Les repères d’entraînement</Text>
            <Text style={{ color: '#707070', fontSize: 12, lineHeight: 19 }}>
              Ce calendrier Élan est une trame générale, indépendante de ces marques. Les références expliquent les types de séance et les principes de progression.
            </Text>
            {programmeSources.map((source) => <Pressable key={source.url} accessibilityRole="link"
              onPress={() => void Linking.openURL(source.url).catch(() => Alert.alert('Référence', 'Le lien n’a pas pu être ouvert.'))}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 38 }}>
              <Text style={{ color: '#000000', fontSize: 12, flex: 1 }}>{source.label}</Text>
              <MaterialCommunityIcons name="open-in-new" size={17} color="#000000" />
            </Pressable>)}
            <Text style={{ color: '#707070', fontSize: 11, lineHeight: 17 }}>Reste à une allure adaptée à tes sensations. En cas de douleur, arrête la séance. Répète une semaine si nécessaire.</Text>
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 24, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#EEEEEE' }}>
          <Pressable accessibilityRole="button" onPress={choose}
            disabled={mutation.isPending || query.isPending || query.isError}
            style={{ backgroundColor: '#000000', minHeight: 54, borderRadius: 18,
              alignItems: 'center', justifyContent: 'center', opacity: query.isError ? 0.4 : 1 }}>
            {mutation.isPending || query.isPending ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{selected ? 'Reprendre mon programme' : 'Commencer ce programme'}</Text>}
          </Pressable>
          {query.isError ? <Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={{ paddingTop: 9 }}>
            <Text style={{ color: '#000000', fontSize: 12, textAlign: 'center' }}>Progression indisponible · Réessayer</Text>
          </Pressable> : null}
        </View>
      </>}
  </SafeAreaView>;
}
