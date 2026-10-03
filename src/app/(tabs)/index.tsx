import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/typography';
import { HomeMetricChart } from '@/features/activities/home-metric-chart';
import { HomePeriodPicker, type HomePeriodSelection } from '@/features/activities/home-period-picker';
import { estimateActiveCalories } from '@/features/activities/calories';
import { useRunnerProfile } from '@/features/onboarding/use-runner-profile';
import { useAuth } from '@/features/auth/auth-provider';
import { firstActivityDate, listActivities, listActivitiesInRange } from '@/services/activities';
import { getMyProfile } from '@/services/friends';
import { formatDuration, formatKm, formatPace } from '@/utils/format';

const ink = '#120D2B';
const white = '#FFFFFF';
const lavender = '#E8D7FF';

export default function Home() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [period, setPeriod] = useState<HomePeriodSelection>({ period: 'today' });
  const profile = useQuery({ queryKey: ['profile', userId], queryFn: () => getMyProfile(userId), enabled: !!userId });
  const firstRun = useQuery({ queryKey: ['activities', userId, 'first-date'],
    queryFn: () => firstActivityDate(userId), enabled: !!userId });
  const recent = useQuery({ queryKey: ['activities', userId, 0],
    queryFn: () => listActivities(userId, 0, 30), enabled: !!userId });
  const runnerProfile = useRunnerProfile();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = period.period === 'custom' && period.start ? new Date(period.start) : new Date(today);
  if (period.period === 'week') start.setDate(start.getDate() - 6);
  if (period.period === 'month') start.setDate(start.getDate() - 29);
  if (period.period === 'all' && firstRun.data) {
    start.setTime(firstRun.data.getTime()); start.setHours(0, 0, 0, 0);
  }
  const end = period.period === 'custom' && period.end ? new Date(period.end) : new Date(today);
  end.setDate(end.getDate() + 1); end.setHours(0, 0, 0, 0);
  const activities = useQuery({ queryKey: ['activities', userId, 'period', start.toISOString(), end.toISOString()],
    queryFn: () => listActivitiesInRange(userId, start, end),
    enabled: !!userId && (period.period !== 'all' || firstRun.isSuccess) });
  const runs = activities.data ?? [];
  const bucketMs = (end.getTime() - start.getTime()) / 7;
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const from = start.getTime() + bucketMs * index;
    const until = index === 6 ? end.getTime() : from + bucketMs;
    const bucketRuns = runs.filter((activity) => {
      const started = new Date(activity.startedAt).getTime(); return started >= from && started < until;
    });
    const distance = bucketRuns.reduce((sum, activity) => sum + activity.distanceMeters, 0);
    const moving = bucketRuns.reduce((sum, activity) => sum + activity.movingSeconds, 0);
    return { distance, pace: distance > 0 ? moving / distance * 1000 : null };
  });
  const periodDistance = runs.reduce((sum, activity) => sum + activity.distanceMeters, 0);
  const periodDuration = runs.reduce((sum, activity) => sum + activity.elapsedSeconds, 0);
  const weight = runnerProfile.data?.weightKg ?? null;
  const calories = weight == null ? null : Math.round(runs.reduce((sum, activity) => sum +
    (estimateActiveCalories(activity.activityType, weight, activity.distanceMeters) ?? 0), 0));
  const periodMoving = runs.reduce((sum, activity) => sum + activity.movingSeconds, 0);
  const periodPace = periodDistance > 0 ? periodMoving / periodDistance * 1000 : null;
  const periodLabel = period.period === 'today' ? 'aujourd’hui' : period.period === 'week' ? '7 jours'
    : period.period === 'month' ? '30 jours' : period.period === 'all' ? 'depuis le début' : 'dates choisies';
  const name = profile.data?.display_name?.trim() || profile.data?.username || 'Coureur';
  const latest = (recent.data ?? []).slice(0, 5);

  return <SafeAreaView style={{ flex: 1, backgroundColor: ink }} edges={['top']}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={{ paddingHorizontal: 17, paddingTop: 20, paddingBottom: 130, gap: 13 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: white, fontSize: 12, fontWeight: '900', letterSpacing: 0.7 }}>BONJOUR,</Text>
          <Text numberOfLines={1} style={{ color: white, fontSize: 28, fontWeight: '900',
            fontStyle: 'italic', letterSpacing: -1.8 }}>{name}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir mon profil"
          onPress={() => router.push('/(tabs)/profile')}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#68C8B2',
            overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
          {profile.data?.avatar_url ? <Image source={{ uri: profile.data.avatar_url }}
            style={{ width: 44, height: 44 }} /> : <Text style={{ fontSize: 20, fontWeight: '900', color: ink }}>
            {name.charAt(0).toUpperCase()}</Text>}
        </Pressable>
      </View>

      <View style={{ height: 258, borderRadius: 25, backgroundColor: '#66ADF1', overflow: 'hidden' }}>
        <Image source={require('../../../assets/dashboard-runner.png')}
          resizeMode="contain" style={{ position: 'absolute', width: '73%', height: 252,
            right: -36, top: 2 }} />
        <View style={{ position: 'absolute', top: 20, left: 19, right: 12 }}>
          <HomePeriodPicker value={period} firstDate={firstRun.data ?? null} onChange={setPeriod} />
          {activities.isPending ? <ActivityIndicator color={white} style={{ alignSelf: 'flex-start', marginTop: 17 }} /> : <>
            <Text style={{ color: white, fontSize: 50, fontWeight: '900', fontStyle: 'italic',
              letterSpacing: -3, lineHeight: 57, marginTop: 3 }}>{calories == null ? '—' : calories}</Text>
            <Text style={{ color: white, fontSize: 12, fontWeight: '800' }}>kcal estimées</Text>
          </>}
        </View>
        <View style={{ position: 'absolute', bottom: 14, left: 19, right: 14,
          flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: white, fontSize: 10, fontWeight: '900' }}>DISTANCE</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: white,
              fontSize: 31, lineHeight: 35, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1.5 }}>
              {activities.isPending ? '—' : formatKm(periodDistance)}<Text style={{ fontSize: 13 }}> km</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: white, fontSize: 10, fontWeight: '900' }}>TEMPS</Text>
            <Text style={{ color: white, fontSize: 26, lineHeight: 35, fontWeight: '900', fontStyle: 'italic' }}>
              {activities.isPending ? '—' : formatDuration(periodDuration)}</Text>
          </View>
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/run')}
        style={{ backgroundColor: lavender, borderRadius: 23, padding: 11,
          flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 39, height: 39, borderRadius: 20, backgroundColor: '#9651D8',
          alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="trophy-outline" size={21} color={white} />
        </View>
        <Text style={{ flex: 1, color: ink, fontWeight: '900', fontSize: 11, lineHeight: 16 }}>
          {runs.length > 0
            ? `${runs.length} sortie${runs.length > 1 ? 's' : ''} · ${formatKm(periodDistance)} km ${periodLabel}`
            : 'PRÊT POUR TA PROCHAINE SORTIE ? LANCE UNE COURSE !'}</Text>
        <MaterialCommunityIcons name="arrow-top-right" size={20} color={ink} />
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, height: 205, backgroundColor: white,
          borderRadius: 22, paddingHorizontal: 12, paddingTop: 13, paddingBottom: 12 }}>
          <MaterialCommunityIcons name="speedometer" size={19} color={ink} />
          <Text style={{ color: ink, fontSize: 11, fontWeight: '900', marginTop: 4 }}>ALLURE</Text>
          <HomeMetricChart kind="pace" values={buckets.map((bucket) => bucket.pace)} />
          <Text style={{ color: ink, fontSize: 20, lineHeight: 24, fontWeight: '900', letterSpacing: -0.8 }}>
            {formatPace(periodPace)}<Text style={{ fontSize: 10 }}> /km</Text></Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, height: 205, backgroundColor: white,
          borderRadius: 22, paddingHorizontal: 12, paddingTop: 13, paddingBottom: 12 }}>
          <MaterialCommunityIcons name="map-marker-distance" size={19} color={ink} />
          <Text style={{ color: ink, fontSize: 11, fontWeight: '900', marginTop: 4 }}>DISTANCE</Text>
          <HomeMetricChart kind="distance" values={buckets.map((bucket) => bucket.distance / 1000)} />
          <Text style={{ color: ink, fontSize: 20, lineHeight: 24, fontWeight: '900', letterSpacing: -0.8 }}>
            {formatKm(periodDistance)}<Text style={{ fontSize: 10 }}> km</Text></Text>
        </View>
      </View>
      <Text style={{ color: '#C8C1DA', fontSize: 11, marginTop: -5 }}>Allure et distance · {periodLabel}</Text>

      <View style={{ marginTop: 17, gap: 11 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: white, fontSize: 17, fontWeight: '800' }}>Tes dernières sorties</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/profile')}>
            <Text style={{ color: '#C8C1DA', fontSize: 12 }}>Tout voir</Text>
          </Pressable>
        </View>
        {latest.map((activity) => <Pressable key={activity.id} accessibilityRole="button"
          onPress={() => router.push({ pathname: '/activity/[id]', params: { id: activity.id } })}
          style={{ minHeight: 75, borderRadius: 19, backgroundColor: '#292240', paddingHorizontal: 15,
            flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <MaterialCommunityIcons name={activity.activityType === 'walking' ? 'walk' : 'run'}
            size={23} color={lavender} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: white, fontWeight: '700', fontSize: 14 }}>{activity.title}</Text>
            <Text style={{ color: '#C8C1DA', fontSize: 11 }}>
              {new Date(activity.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              {' · '}{formatDuration(activity.elapsedSeconds)}</Text>
          </View>
          <Text style={{ color: white, fontWeight: '800' }}>{formatKm(activity.distanceMeters)} km</Text>
        </Pressable>)}
        {!latest.length && !recent.isPending ? <Text style={{ color: '#C8C1DA', fontSize: 13 }}>
          Tes courses apparaîtront ici après ta première sortie.</Text> : null}
        {activities.isError ? <Pressable onPress={() => void activities.refetch()}>
          <Text style={{ color: white }}>Chargement impossible. Appuie pour réessayer.</Text>
        </Pressable> : null}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
