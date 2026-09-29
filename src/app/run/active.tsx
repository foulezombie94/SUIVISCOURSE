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

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={{ gap: 3 }}>
    <Text style={{ color: '#BDBDBD', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 }}>{label}</Text>
    <Text style={{ color: paper, fontSize: 13, fontFamily: fonts.monoBold }}>{value}</Text>
  </View>;
}

function MusicCard() {
  return <View accessibilityLabel="Lecteur musique, prochain morceau Side Bend" style={{
    alignSelf: 'stretch', height: 64, borderRadius: 20, backgroundColor: '#161616',
    borderWidth: 2, borderColor: '#E3433B', padding: 5,
  }}>
    <View style={{ flex: 1, borderRadius: 14, backgroundColor: '#252525',
      paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: '#D8D8D8',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Text style={{ color: ink, fontSize: 22 }}>🏃🏻</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 2 }}>
        <Text style={{ color: '#C8C8C8', fontSize: 8, fontWeight: '700' }}>Next</Text>
        <Text numberOfLines={1} style={{ color: paper, fontSize: 10, fontWeight: '800' }}>
          Side Bend
        </Text>
      </View>
      <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1,
        borderColor: '#BDBDBD', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 1 }}>
        <Text style={{ color: paper, fontSize: 11, lineHeight: 14 }}>▶</Text>
        <View style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: paper }} />
      </View>
    </View>
  </View>;
}

export default function ActiveRun() {
  const { width, height } = useWindowDimensions();
  const [mapRefresh, setMapRefresh] = useState(0);
  const { active, pause, resume, finish, busy, error } = useRunStore();
  useEffect(() => {
    const timer = setInterval(() => setMapRefresh((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, []);
  if (!active) return <Redirect href="/(tabs)/run" />;

  const mapHeight = Math.round(Math.min(height * 0.34, 300));
  const ringSize = Math.round(Math.min(width * 0.59, 232));
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
      marginTop: -18, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stat label="DISTANCE" value={active.distanceMeters < 1000
          ? `${Math.round(active.distanceMeters)} M` : `${formatKm(active.distanceMeters)} KM`} />
        <Text style={{ color: paper, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 }}>
          {active.state === 'autoPaused' ? 'PAUSE AUTO' : active.state === 'paused' ? 'EN PAUSE' : 'COURSE'}
        </Text>
        <Stat label="ALLURE / KM" value={formatPace(pace)} />
      </View>
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
          <Pressable accessibilityRole="button"
            accessibilityLabel={active.state === 'running' ? 'Mettre en pause' : 'Reprendre'}
            disabled={busy} onPress={() => active.state === 'running' ? void pause() : void resume()}
            style={({ pressed }) => ({ width: 58, height: 58, aspectRatio: 1, borderRadius: 29,
              backgroundColor: '#242424', borderWidth: 1, borderColor: '#585858',
              alignItems: 'center', justifyContent: 'center', marginTop: 10, overflow: 'hidden',
              transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
            <Text style={{ color: paper, fontSize: 17, fontWeight: '900' }}>
              {active.state === 'running' ? 'Ⅱ' : '▶'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <Stat label="VITESSE" value={`${speed.toFixed(1)} KM/H`} />
        <Pressable accessibilityRole="button" accessibilityLabel="Terminer la course"
          disabled={busy} onPress={finishRun}
          style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 15,
            backgroundColor: accent, alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
          <View style={{ width: 17, height: 17, borderRadius: 3, backgroundColor: paper }} />
        </Pressable>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: ringTrack, overflow: 'hidden' }}>
        <View style={{ width: `${lapProgress * 100}%`, height: 4, backgroundColor: accent }} />
      </View>
      <MusicCard />
      {error ? <Text style={{ alignSelf: 'stretch', color: paper, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>{error}</Text> : null}
    </View>
  </SafeAreaView>;
}
