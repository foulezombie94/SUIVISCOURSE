import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '@/components/route-map';
import { getTrackPoints, useRunStore } from '@/store/run-store';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import { fonts } from '@/constants/typography';

const ink = '#080808';
const paper = '#FFFFFF';
const accent = '#C8F23A';
const stopAccent = '#FF493D';
const ringTrack = '#262626';

function Stat({ label, value, centered = false }: { label: string; value: string; centered?: boolean }) {
  return <View style={{ gap: 3, alignItems: centered ? 'center' : 'flex-start' }}>
    <Text style={{ color: '#BDBDBD', fontSize: 9, fontWeight: '800', letterSpacing: 0.7,
      textAlign: centered ? 'center' : 'left' }}>{label}</Text>
    <Text style={{ color: paper, fontSize: 13, fontFamily: fonts.monoBold,
      fontWeight: '700', fontVariant: ['tabular-nums'],
      textAlign: centered ? 'center' : 'left' }}>{value}</Text>
  </View>;
}

function MusicCard() {
  return <View accessibilityLabel="Lecteur musique, prochain morceau Side Bend" style={{
    alignSelf: 'stretch', height: 64, borderRadius: 20, backgroundColor: '#111111',
    borderWidth: 1, borderColor: '#343434', padding: 5,
  }}>
    <View style={{ flex: 1, borderRadius: 14, backgroundColor: '#171717',
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
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const holdProgress = useSharedValue(0);
  const { active, pause, resume, finish, busy, error } = useRunStore();
  const stopButtonScale = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + holdProgress.value * 0.55 }],
  }));
  const completeHold = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    void (async () => {
      const saved = await finish();
      if (saved) {
        router.replace({ pathname: '/run/summary', params: { id: saved.id } });
      } else {
        finishingRef.current = false;
        setFinishing(false);
        holdProgress.set(withSpring(0, { damping: 14, stiffness: 180 }));
      }
    })();
  }, [finish, holdProgress]);
  const startStopHold = () => {
    if (busy || finishingRef.current) return;
    cancelAnimation(holdProgress);
    holdProgress.set(withTiming(1, { duration: 1500 }, (finished) => {
      if (finished) runOnJS(completeHold)();
    }));
  };
  const cancelStopHold = () => {
    if (finishingRef.current) return;
    cancelAnimation(holdProgress);
    holdProgress.set(withSpring(0, { damping: 14, stiffness: 180 }));
  };
  useEffect(() => {
    const timer = setInterval(() => setMapRefresh((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, []);
  if (!active) return finishing
    ? <View style={{ flex: 1, backgroundColor: ink }}>
      <StatusBar style="light" />
    </View>
    : <Redirect href="/(tabs)/run" />;

  const mapHeight = Math.round(Math.min(height * 0.44, 390));
  const ringSize = Math.round(Math.min(width * 0.62, 240));
  const center = ringSize / 2;
  const radius = center - 13;
  const circumference = 2 * Math.PI * radius;
  const lapProgress = Math.max(0.002, (active.distanceMeters % 1000) / 1000);
  const pace = active.distanceMeters >= 100
    ? active.movingSeconds / (active.distanceMeters / 1000) : null;
  const speed = active.movingSeconds > 0
    ? active.distanceMeters / active.movingSeconds * 3.6 : 0;
  const trackPoints = getTrackPoints();

  return <SafeAreaView style={{ flex: 1, backgroundColor: ink }} edges={['top', 'bottom']}>
    <StatusBar style="light" />
    <View style={{ height: mapHeight, backgroundColor: ink, overflow: 'hidden' }}>
      {trackPoints.length > 0
        ? <RouteMap points={trackPoints} height={mapHeight} refreshToken={mapRefresh} followCurrent fill interactive />
        : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ color: paper, fontSize: 38 }}>◎</Text>
          <Text style={{ color: paper, fontWeight: '800' }}>Recherche du tracé GPS…</Text>
        </View>}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.28)' }} />
      <View style={{ position: 'absolute', top: 8, left: 22, right: 22,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(8,8,8,0.78)',
          alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#353535' }}>
          <MaterialCommunityIcons name="run" size={22} color={accent} />
        </View>
        <View style={{ alignItems: 'center', gap: 3 }}>
          <Text style={{ color: paper, fontSize: 15, fontWeight: '900', letterSpacing: 2 }}>RUNNING</Text>
          <Text style={{ color: '#D4D4D4', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 }}>
            {active.state === 'autoPaused' ? 'PAUSE AUTOMATIQUE' : active.state === 'paused' ? 'EN PAUSE' : 'SÉANCE EN COURS'}
          </Text>
        </View>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(8,8,8,0.78)',
          alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#353535' }}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={paper} />
        </View>
      </View>
    </View>

    <View style={{ flex: 1, backgroundColor: ink, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      marginTop: -22, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
        <Stat label="TEMPS" value={formatDuration(active.elapsedSeconds)} />
        <View style={{ width: 1, height: 28, backgroundColor: '#333333' }} />
        <Stat label="ALLURE MOY." value={formatPace(pace)} centered />
        <View style={{ width: 1, height: 28, backgroundColor: '#333333' }} />
        <Stat label="VITESSE" value={`${speed.toFixed(1)} KM/H`} centered />
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
          <Text style={{ color: paper, fontSize: 47, fontFamily: fonts.monoBold,
            fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {formatKm(active.distanceMeters)}
          </Text>
          <Text style={{ color: '#C8F23A', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>KILOMÈTRES</Text>
        </View>
      </View>

      <View style={{ alignSelf: 'stretch', height: 66, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' }}>
        <Pressable accessibilityRole="button"
          accessibilityLabel={active.state === 'running' ? 'Mettre en pause' : 'Reprendre'}
          disabled={busy} onPress={() => active.state === 'running' ? void pause() : void resume()}
          style={({ pressed }) => ({ position: 'absolute', left: 0, width: 66, height: 66,
            aspectRatio: 1, borderRadius: 33, backgroundColor: accent,
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
          <MaterialCommunityIcons name={active.state === 'running' ? 'pause' : 'play'} size={27} color={ink} />
        </Pressable>
        <Animated.View style={[{ position: 'absolute', right: 0, width: 58, height: 58 }, stopButtonScale]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Maintenir pour terminer la course"
            accessibilityHint="Maintiens le bouton rond une seconde et demie pour terminer. Relâcher avant annule."
            disabled={busy || finishing}
            onPressIn={startStopHold} onPressOut={cancelStopHold}
            style={({ pressed }) => ({ width: 58, height: 58, aspectRatio: 1, borderRadius: 29,
              backgroundColor: stopAccent, alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
            <View style={{ width: 17, height: 17, borderRadius: 3, backgroundColor: paper }} />
          </Pressable>
        </Animated.View>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: ringTrack, overflow: 'hidden' }}>
        <View style={{ width: `${lapProgress * 100}%`, height: 4, backgroundColor: accent }} />
      </View>
      <MusicCard />
      {error ? <Text style={{ alignSelf: 'stretch', color: paper, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>{error}</Text> : null}
    </View>
  </SafeAreaView>;
}
