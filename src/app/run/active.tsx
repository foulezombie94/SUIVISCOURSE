import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, Extrapolation, interpolate,
  useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
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
const stopOrange = '#FF7900';
const ringTrack = '#3B3B3B';
const STOP_HOLD_MS = 2200;

function Stat({ label, value, centered = false }: { label: string; value: string; centered?: boolean }) {
  return <View style={{ gap: 3, alignItems: centered ? 'center' : 'flex-start' }}>
    <Text style={{ color: '#BDBDBD', fontSize: 9, fontWeight: '800', letterSpacing: 0.7,
      textAlign: centered ? 'center' : 'left' }}>{label}</Text>
    <Text style={{ color: paper, fontSize: 13, fontFamily: fonts.monoBold,
      textAlign: centered ? 'center' : 'left' }}>{value}</Text>
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
  const [finishing, setFinishing] = useState(false);
  const holdingRef = useRef(false);
  const finishingRef = useRef(false);
  const holdProgress = useSharedValue(0);
  const { active, pause, resume, finish, busy, error } = useRunStore();
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - holdProgress.value) * height }],
  }), [height]);
  const messageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(holdProgress.value, [0, 0.52, 0.6, 1], [0, 0, 1, 1], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(holdProgress.value,
      [0, 0.52, 0.92, 1], [-width, -width, 0, 0], Extrapolation.CLAMP) }],
  }), [width]);
  const completeHold = useCallback(() => {
    if (!holdingRef.current || finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    void (async () => {
      const saved = await finish();
      if (saved) {
        router.replace({ pathname: '/run/summary', params: { id: saved.id } });
      } else {
        finishingRef.current = false;
        setFinishing(false);
        holdProgress.set(withTiming(0, { duration: 280 }));
      }
    })();
  }, [finish, holdProgress]);
  const startStopHold = () => {
    if (busy || finishingRef.current) return;
    holdingRef.current = true;
    cancelAnimation(holdProgress);
    holdProgress.set(0);
    holdProgress.set(withTiming(1, { duration: STOP_HOLD_MS, easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(completeHold);
    }));
  };
  const cancelStopHold = () => {
    holdingRef.current = false;
    if (finishingRef.current) return;
    cancelAnimation(holdProgress);
    holdProgress.set(withTiming(0, { duration: 280 }));
  };
  useEffect(() => {
    const timer = setInterval(() => setMapRefresh((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, []);
  if (!active) return finishing
    ? <View style={{ flex: 1, backgroundColor: stopOrange, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style="dark" />
      <Text style={{ color: ink, fontSize: Math.min(width * 0.12, 46), fontFamily: fonts.bold,
        textAlign: 'center' }}>COURSE{'\n'}TERMINÉE</Text>
    </View>
    : <Redirect href="/(tabs)/run" />;

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
        </View>
      </View>

      <View style={{ alignSelf: 'stretch', height: 58, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' }}>
        <Stat label="VITESSE" value={`${speed.toFixed(1)} KM/H`} centered />
        <Pressable accessibilityRole="button"
          accessibilityLabel={active.state === 'running' ? 'Mettre en pause' : 'Reprendre'}
          disabled={busy} onPress={() => active.state === 'running' ? void pause() : void resume()}
          style={({ pressed }) => ({ position: 'absolute', left: 0, width: 58, height: 58,
            aspectRatio: 1, borderRadius: 29, backgroundColor: paper,
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
          <MaterialCommunityIcons name={active.state === 'running' ? 'pause' : 'play'}
            size={25} color={ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Maintenir pour terminer la course"
          accessibilityHint="Maintiens le bouton jusqu’à ce que l’orange remplisse l’écran. Relâcher avant annule."
          disabled={busy || finishing} onPressIn={startStopHold} onPressOut={cancelStopHold}
          style={({ pressed }) => ({ position: 'absolute', right: 0, width: 56, height: 56, borderRadius: 15,
            backgroundColor: stopOrange, alignItems: 'center', justifyContent: 'center',
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
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0,
      bottom: 0, left: 0, backgroundColor: stopOrange }, fillStyle]} />
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0,
      bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }, messageStyle]}>
      <Text style={{ color: ink, fontSize: Math.min(width * 0.12, 46), fontFamily: fonts.bold,
        textAlign: 'center', lineHeight: Math.min(width * 0.14, 54) }}>
        COURSE{'\n'}TERMINÉE
      </Text>
    </Animated.View>
  </SafeAreaView>;
}
