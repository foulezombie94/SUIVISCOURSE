import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '@/components/route-map';
import { getTrackPoints, useRunStore } from '@/store/run-store';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import { fonts } from '@/constants/typography';

const ink = '#0C1116';
const paper = '#FFFFFF';
const accent = '#B9F532';
const stopAccent = '#FF493D';
const ringTrack = '#253038';

function Stat({ label, value, centered = false }: { label: string; value: string; centered?: boolean }) {
  return <View style={{ gap: 3, alignItems: centered ? 'center' : 'flex-start' }}>
    <Text style={{ color: '#BDBDBD', fontSize: 9, fontWeight: '800', letterSpacing: 0.7,
      textAlign: centered ? 'center' : 'left' }}>{label}</Text>
    <Text style={{ color: paper, fontSize: 13, fontFamily: fonts.monoBold,
      fontWeight: '700', fontVariant: ['tabular-nums'],
      textAlign: centered ? 'center' : 'left' }}>{value}</Text>
  </View>;
}

function MusicCard({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Choisir Apple Music ou Spotify"
    onPress={onPress} style={({ pressed }) => ({ alignSelf: 'stretch', height: 68,
      borderRadius: 18, backgroundColor: '#252E35', paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 13,
      transform: [{ scale: pressed ? 0.98 : 1 }] })}>
    <MaterialCommunityIcons name="music-note" size={22} color={paper} />
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={{ color: paper, fontSize: 12, fontWeight: '800' }}>Votre musique</Text>
      <Text style={{ color: '#A8B2B9', fontSize: 10 }}>Apple Music ou Spotify</Text>
    </View>
    <MaterialCommunityIcons name="skip-next" size={24} color={paper} />
  </Pressable>;
}

export default function ActiveRun() {
  const { width, height } = useWindowDimensions();
  const [mapRefresh, setMapRefresh] = useState(0);
  const [mapVisible, setMapVisible] = useState(false);
  const [musicVisible, setMusicVisible] = useState(false);
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
    if (!mapVisible) return;
    const timer = setInterval(() => setMapRefresh((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, [mapVisible]);
  const openMusicService = async (url: string) => {
    setMusicVisible(false);
    try { await Linking.openURL(url); }
    catch { Alert.alert('Application indisponible', 'Impossible d’ouvrir ce service musical sur cet appareil.'); }
  };
  if (!active) return finishing
    ? <View style={{ flex: 1, backgroundColor: ink }}>
      <StatusBar style="light" />
    </View>
    : <Redirect href="/(tabs)/run" />;

  const ringSize = Math.round(Math.min(width - 48, height * 0.38, 330));
  const center = ringSize / 2;
  const radius = center - 12;
  const circumference = 2 * Math.PI * radius;
  const lapProgress = Math.max(0.002, (active.distanceMeters % 1000) / 1000);
  const pace = active.distanceMeters >= 100
    ? active.movingSeconds / (active.distanceMeters / 1000) : null;
  const speed = active.movingSeconds > 0
    ? active.distanceMeters / active.movingSeconds * 3.6 : 0;
  const trackPoints = getTrackPoints();

  return <SafeAreaView style={{ flex: 1, backgroundColor: ink, paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 12, gap: 14 }} edges={['top', 'bottom']}>
    <StatusBar style="light" />
    <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quitter l’écran de course"
        onPress={() => router.replace('/(tabs)/run')}
        style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="close" size={24} color={paper} />
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialCommunityIcons name="run" size={17} color={paper} />
        <Text style={{ color: paper, fontSize: 15, fontWeight: '800' }}>Running</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={paper} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Voir la carte"
        onPress={() => setMapVisible(true)}
        style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="map-outline" size={22} color={paper} />
      </Pressable>
    </View>

    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ minHeight: 30, borderRadius: 16, backgroundColor: '#252E35',
        paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <MaterialCommunityIcons name="crosshairs-gps" size={14} color={accent} />
        <Text style={{ color: paper, fontSize: 10, fontWeight: '800' }}>GPS</Text>
      </View>
      <View style={{ minHeight: 30, borderRadius: 16, backgroundColor: '#252E35',
        paddingHorizontal: 12, justifyContent: 'center' }}>
        <Text style={{ color: paper, fontSize: 10, fontWeight: '800' }}>
          {active.state === 'running' ? 'EN COURS' : 'EN PAUSE'}
        </Text>
      </View>
    </View>

    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      <View style={{ width: ringSize, height: ringSize,
        alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={ringSize} height={ringSize}
          viewBox={'0 0 ' + ringSize + ' ' + ringSize} style={{ position: 'absolute' }}>
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={ringTrack} strokeWidth={2} />
          <Circle cx={center} cy={center} r={radius - 20} fill="none" stroke={ringTrack} strokeWidth={1} />
          <Circle cx={center} cy={center} r={radius - 40} fill="none" stroke={ringTrack} strokeWidth={1} />
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={accent}
            strokeWidth={5} strokeLinecap="round"
            strokeDasharray={circumference * lapProgress + ' ' + circumference}
            rotation={-90} origin={center + ', ' + center} />
        </Svg>
        <View style={{ alignItems: 'center', gap: 5 }}>
          <MaterialCommunityIcons name="navigation-variant-outline" size={23} color={accent} />
          <Text style={{ color: paper, fontSize: Math.min(ringSize * 0.18, 58),
            fontFamily: fonts.monoBold, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {formatKm(active.distanceMeters)}
          </Text>
          <Text style={{ color: '#A8B2B9', fontSize: 11, fontWeight: '700' }}>Distance (km)</Text>
        </View>
      </View>
      <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-around' }}>
        <Stat label="ALLURE / KM" value={formatPace(pace)} centered />
        <Stat label="DURÉE" value={formatDuration(active.elapsedSeconds)} centered />
        <Stat label="VITESSE" value={speed.toFixed(1) + ' km/h'} centered />
      </View>
    </View>

    <MusicCard onPress={() => setMusicVisible(true)} />
    <View style={{ height: 92, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-around' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voir le parcours"
        onPress={() => setMapVisible(true)}
        style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#253038',
          alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="map-marker-path" size={23} color={paper} />
      </Pressable>
      <Pressable accessibilityRole="button"
        accessibilityLabel={active.state === 'running' ? 'Mettre en pause' : 'Reprendre'}
        disabled={busy} onPress={() => active.state === 'running' ? void pause() : void resume()}
        style={({ pressed }) => ({ width: 90, height: 90, borderRadius: 45,
          backgroundColor: accent, alignItems: 'center', justifyContent: 'center', gap: 2,
          transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
        <MaterialCommunityIcons name={active.state === 'running' ? 'pause' : 'play'}
          size={26} color={ink} />
        <Text style={{ color: ink, fontSize: 11, fontWeight: '900' }}>
          {active.state === 'running' ? 'Pause' : 'Reprendre'}
        </Text>
      </Pressable>
      <Animated.View style={[{ width: 58, height: 58 }, stopButtonScale]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Maintenir pour terminer la course"
          accessibilityHint="Maintiens une seconde et demie pour terminer. Relâcher avant annule."
          disabled={busy || finishing} onPressIn={startStopHold} onPressOut={cancelStopHold}
          style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: stopAccent,
            alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 17, height: 17, borderRadius: 3, backgroundColor: paper }} />
        </Pressable>
      </Animated.View>
    </View>
    {error ? <Text style={{ color: paper, fontSize: 12, fontWeight: '800',
      textAlign: 'center' }}>{error}</Text> : null}

    <Modal visible={mapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: ink }} edges={['top', 'bottom']}>
        <View style={{ height: 56, paddingHorizontal: 20, flexDirection: 'row',
          alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: paper, fontSize: 17, fontWeight: '900' }}>Votre parcours</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer la carte"
            onPress={() => setMapVisible(false)}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="close" size={24} color={paper} />
          </Pressable>
        </View>
        {trackPoints.length
          ? <RouteMap points={trackPoints} height={height} refreshToken={mapRefresh}
            followCurrent fill interactive />
          : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: paper, fontSize: 15 }}>Recherche du tracé GPS…</Text>
          </View>}
      </SafeAreaView>
    </Modal>

    <Modal visible={musicVisible} transparent animationType="fade"
      onRequestClose={() => setMusicVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24,
        backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le choix musical"
          onPress={() => setMusicVisible(false)}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <View style={{ backgroundColor: paper, borderRadius: 24, padding: 20, gap: 14 }}>
          <Text style={{ color: ink, fontSize: 22, fontWeight: '900' }}>Votre musique</Text>
          <Pressable accessibilityRole="button"
            onPress={() => void openMusicService('https://music.apple.com/')}
            style={{ height: 54, borderRadius: 14, borderWidth: 1, borderColor: ink,
              flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
            <MaterialCommunityIcons name="apple" size={23} color={ink} />
            <Text style={{ color: ink, fontSize: 15, fontWeight: '800' }}>Apple Music</Text>
          </Pressable>
          <Pressable accessibilityRole="button"
            onPress={() => void openMusicService('https://open.spotify.com/')}
            style={{ height: 54, borderRadius: 14, backgroundColor: ink,
              flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
            <MaterialCommunityIcons name="spotify" size={23} color={paper} />
            <Text style={{ color: paper, fontSize: 15, fontWeight: '800' }}>Spotify</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}
