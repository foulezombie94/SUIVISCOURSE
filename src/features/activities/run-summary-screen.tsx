import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/typography';
import { SummarySplitsChart } from '@/features/activities/summary-splits-chart';
import { useAuth } from '@/features/auth/auth-provider';
import { getActivity } from '@/services/activities';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import { WorkoutSummary } from '@/features/programmes/workout-summary';

const red = '#ED183B';
const numberFont = Platform.select({ ios: 'AvenirNextCondensed-DemiBold', android: 'sans-serif-condensed',
  default: 'system-ui' });

function Metric({ icon, value, label, size = 36, unit }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string;
  size?: number; unit?: string;
}) {
  return <View style={{ gap: 3 }}>
    <MaterialCommunityIcons name={icon} size={17} color={red} />
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: numberFont,
      color: '#FFFFFF', fontSize: size, lineHeight: size * 1.12, fontWeight: '700',
      letterSpacing: -0.8, fontVariant: ['tabular-nums'] }}>{value}
      {unit ? <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '700' }}> {unit}</Text> : null}
    </Text>
    <Text style={{ color: '#929299', fontSize: 12 }}>{label}</Text>
  </View>;
}

export function RunSummaryScreen({ id }: { id: string }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const query = useQuery({ queryKey: ['activity', userId, id],
    queryFn: () => getActivity(userId, id), enabled: !!userId && !!id });
  const activity = query.data;

  if (query.isPending) return <SafeAreaView style={{ flex: 1, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator color={red} size="large" />
  </SafeAreaView>;
  if (!activity) return <SafeAreaView style={{ flex: 1, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center', padding: 24, gap: 15 }}>
    <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '800' }}>Course introuvable</Text>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')}>
      <Text style={{ color: red }}>Retour à l’accueil</Text>
    </Pressable>
  </SafeAreaView>;

  const pace = activity.averagePaceSecPerKm ?? (activity.distanceMeters > 0
    ? activity.movingSeconds / activity.distanceMeters * 1000 : null);
  const lastPace = activity.splits.at(-1)?.movingSeconds ?? pace;
  const panelHeight = Math.max(610, height - insets.top - insets.bottom);
  const left = Math.max(26, Math.min(48, width * 0.12));

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top', 'bottom']}>
    <StatusBar style="light" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ minHeight: panelHeight, paddingLeft: left, paddingRight: 25,
        paddingTop: 12, paddingBottom: 14 }}>
        <View style={{ height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <MaterialCommunityIcons name="run-fast" size={27} color="#FFFFFF" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View accessibilityLabel={activity.points.length ? 'Tracé GPS enregistré' : 'Aucun tracé GPS'}
              style={{ width: 31, height: 35, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="shield-check-outline" size={31}
                color={activity.points.length ? '#A7DC31' : '#929299'} />
              <Text style={{ position: 'absolute', color: '#FFFFFF', fontSize: 7, fontWeight: '900' }}>GPS</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Détails de la course"
              onPress={() => router.push({ pathname: '/activity/[id]', params: { id } })}
              hitSlop={10} style={{ width: 32, height: 36, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="shield-outline" size={31} color={red} />
              <MaterialCommunityIcons name="arrow-right" size={13} color="#FFFFFF"
                style={{ position: 'absolute' }} />
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: panelHeight * 0.035 }}>
          <Metric icon="clock-outline" value={formatDuration(activity.elapsedSeconds)} label="Temps" size={39} />
        </View>
        <View style={{ marginTop: panelHeight * 0.02 }}>
          <Metric icon="map-marker-distance" value={formatKm(activity.distanceMeters)} label="Distance · km" size={92} />
          <View style={{ width: '72%', height: 5, backgroundColor: '#27272D', marginTop: 20 }}>
            <View style={{ width: '58%', height: 5, backgroundColor: red }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: panelHeight * 0.035, gap: 24 }}>
          <View style={{ flex: 1 }}><Metric icon="speedometer" value={formatPace(lastPace)} label="Dernière allure" /></View>
          <View style={{ flex: 1 }}><Metric icon="speedometer-medium" value={formatPace(pace)} label="Allure moyenne" /></View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
          marginTop: panelHeight * 0.03 }}>
          <View accessibilityLabel="Fréquence cardiaque non mesurée">
            <Metric icon="heart-pulse" value="—" unit="BPM" label="Fréquence cardiaque" size={33} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: -12 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Détails et partage"
              onPress={() => router.push({ pathname: '/activity/[id]', params: { id } })}
              style={{ width: 37, height: 37, borderRadius: 19, backgroundColor: '#33343A',
                alignItems: 'center', justifyContent: 'center', marginRight: -8 }}>
              <MaterialCommunityIcons name="dots-horizontal" size={19} color="#FFFFFF" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Terminer et revenir à l’accueil"
              onPress={() => router.replace('/(tabs)')}
              style={({ pressed }) => ({ width: 76, height: 76, borderRadius: 38, backgroundColor: red,
                alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
              <MaterialCommunityIcons name="check" size={30} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
        <View style={{ marginTop: 'auto', paddingTop: 42 }}>
          <SummarySplitsChart splits={activity.splits} />
        </View>
        {activity.syncState === 'pending' ? <Text style={{ color: '#929299', fontSize: 11, marginTop: 10 }}>
          Course enregistrée sur le téléphone. Synchronisation en attente.</Text> : null}
        {activity.verificationStatus === 'suspicious' ? <Text style={{ color: red, fontSize: 11, marginTop: 10 }}>
          Des données GPS incohérentes ont été détectées.</Text> : null}
      </View>
      {activity.workout ? <View style={{ paddingHorizontal: 24, paddingTop: 15, paddingBottom: 24 }}>
        <WorkoutSummary workout={activity.workout} />
      </View> : null}
    </ScrollView>
  </SafeAreaView>;
}
