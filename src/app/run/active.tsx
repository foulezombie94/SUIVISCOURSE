import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '@/components/route-map';
import { getTrackPoints, useRunStore } from '@/store/run-store';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import { fonts } from '@/constants/typography';

const ink = '#080808';
const paper = '#FFFFFF';
const accent = '#FF493D';
const ringTrack = '#3B3B3B';

export default function ActiveRun() {
  const { width, height } = useWindowDimensions();
  const [mapRefresh, setMapRefresh] = useState(0);
  const { active, pause, resume, finish, busy, error } = useRunStore();
  useEffect(() => {
    const timer = setInterval(() => setMapRefresh((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, []);
  if (!active) return <Redirect href="/(tabs)/run" />;

  const mapHeight = Math.round(Math.min(height * 0.4, 360));
  const ringSize = Math.round(Math.min(width * 0.67, 270));
  const center = ringSize / 2;
  const radius = center - 13;
  const circumference = 2 * Math.PI * radius;
  const lapProgress = Math.max(0.002, (active.distanceMeters % 1000) / 1000);
  const pace = active.distanceMeters >= 100
    ? active.movingSeconds / (active.distanceMeters / 1000) : null;
  const speed = active.movingSeconds > 0
    ? active.distanceMeters / active.movingSeconds * 3.6 : 0;
  const trackPoints = getTrackPoints();
  const finishRun = () => Alert.alert('Terminer la course ?', 'Le résumé sera sauvegardé sur ton téléphone.',
    [{ text: 'Continuer', style: 'cancel' }, { text: 'Terminer', onPress: async () => {
      const saved = await finish();
      if (saved) router.replace({ pathname: '/run/summary', params: { id: saved.id } });
    } }]);

  return <SafeAreaView style={{ flex: 1, backgroundColor: ink }} edges={['top', 'bottom']}>
    <StatusBar style="light" />
    <View style={{ height: mapHeight, backgroundColor: ink }}>
      {trackPoints.length > 0
        ? <RouteMap points={trackPoints} height={mapHeight} refreshToken={mapRefresh} followCurrent fill interactive />
        : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ color: paper, fontSize: 38 }}>◎</Text>
          <Text style={{ color: paper, fontWeight: '800' }}>Recherche du tracé GPS…</Text>
        </View>}
    </View>

    <View style={{ flex: 1, backgroundColor: ink, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      marginTop: -18, alignItems: 'center', paddingHorizontal: 24, paddingTop: 14,
      paddingBottom: 12, gap: 8 }}>
      <Text style={{ color: paper, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>
        {active.state === 'autoPaused' ? 'PAUSE AUTO' : active.state === 'paused' ? 'EN PAUSE' : 'TEMPS ÉCOULÉ'}
      </Text>
      <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}
          style={{ position: 'absolute' }}>
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={ringTrack}
            strokeWidth={8} strokeDasharray="4 8" />
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={accent}
            strokeWidth={8} strokeLinecap="round" strokeDasharray={`${circumference * lapProgress} ${circumference}`} />
        </Svg>
        <View style={{ alignItems: 'center', gap: 5 }}>
          <Text style={{ color: paper, fontSize: 38, fontFamily: fonts.monoBold }}>
            {formatDuration(active.elapsedSeconds)}
          </Text>
          <Text style={{ color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 }}>TEMPS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 8 }}>
            <Text style={{ color: paper, fontSize: 23, fontFamily: fonts.monoBold }}>
              {active.distanceMeters < 1000
                ? `${Math.round(active.distanceMeters)}` : formatKm(active.distanceMeters)}
            </Text>
            <Text style={{ color: paper, fontSize: 10, fontWeight: '900' }}>
              {active.distanceMeters < 1000 ? 'M' : 'KM'}
            </Text>
          </View>
          <Text style={{ color: paper, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 }}>DISTANCE</Text>
        </View>
      </View>

      <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
        <Pressable accessibilityRole="button"
          accessibilityLabel={active.state === 'running' ? 'Mettre en pause' : 'Reprendre'}
          disabled={busy} onPress={() => active.state === 'running' ? void pause() : void resume()}
          style={({ pressed }) => ({ width: 54, height: 54, borderRadius: 27,
            backgroundColor: '#242424', borderWidth: 1, borderColor: '#585858',
            alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
          <Text style={{ color: paper, fontSize: 19, fontWeight: '900' }}>
            {active.state === 'running' ? 'Ⅱ' : '▶'}
          </Text>
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', gap: 8 }}>
          <View style={{ gap: 4, alignItems: 'center' }}>
            <Text style={{ color: paper, fontSize: 10, fontWeight: '800' }}>ALLURE</Text>
            <Text style={{ color: paper, fontSize: 15, fontFamily: fonts.monoBold }}>{formatPace(pace)}</Text>
          </View>
          <View style={{ width: 1, backgroundColor: ringTrack }} />
          <View style={{ gap: 4, alignItems: 'center' }}>
            <Text style={{ color: paper, fontSize: 10, fontWeight: '800' }}>VITESSE</Text>
            <Text style={{ color: paper, fontSize: 15, fontFamily: fonts.monoBold }}>{speed.toFixed(1)} KM/H</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Terminer la course"
          disabled={busy} onPress={finishRun}
          style={({ pressed }) => ({ width: 54, height: 54, borderRadius: 16,
            backgroundColor: accent, alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
          <View style={{ width: 17, height: 17, borderRadius: 3, backgroundColor: paper }} />
        </Pressable>
      </View>
      {error ? <Text style={{ alignSelf: 'stretch', color: paper, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>{error}</Text> : null}
    </View>
  </SafeAreaView>;
}
