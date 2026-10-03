import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '@/components/route-map';
import { getTrackPoints, useRunStore } from '@/store/run-store';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import { fonts } from '@/constants/typography';
import { useRunnerProfile } from '@/features/onboarding/use-runner-profile';
import { estimateActiveCalories } from '@/features/activities/calories';
import { GuidedRunScreen } from '@/features/programmes/guided-run-screen';

const ink = '#0C1116';
const paper = '#FFFFFF';
const accent = '#B9F532';
const stopAccent = '#FF493D';
type MetricIconName = 'pace' | 'duration' | 'calories';

function MetricIcon({ name }: { name: MetricIconName }) {
  return <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
    {name === 'pace' ? <>
      <Circle cx={15.5} cy={4} r={1.5} stroke={paper} strokeWidth={1.7} />
      <Path d="m12 8 3 1 2 3m-5-4-2 4-3 2m5-2 3 3-1 5m-4-7-3 5-3 2m12-9 3 1 2-2"
        stroke={paper} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </> : name === 'duration' ? <>
      <Circle cx={12} cy={13} r={8} stroke={paper} strokeWidth={1.7} />
      <Path d="M12 13 15 9M9 2h6M12 2v3" stroke={paper} strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round" />
    </> : <Path d="M12 2c2 4 5 6 5 11 0 4-2.2 7-5 7s-5-3-5-7c0-2.6 1-4.5 2.5-6.5.2 2.1 1.1 3.3 2 4.1C11.8 7.6 12.2 5 12 2Z"
      stroke={paper} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />}
  </Svg>;
}

function Stat({ icon, label, value }: { icon: MetricIconName; label: string; value: string }) {
  return <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 5 }}>
    <MetricIcon name={icon} />
    <Text numberOfLines={1} style={{ color: paper, fontSize: 15,
      fontFamily: fonts.monoBold, fontWeight: '700', fontVariant: ['tabular-nums'],
      textAlign: 'center' }}>{value}</Text>
    <Text style={{ color: '#A8B2B9', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
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
  const mode = useRunStore((state) => state.active ? state.active.workout ? 'guided' : 'free' : null);
  const [lastMode, setLastMode] = useState(mode);
  if (mode && mode !== lastMode) setLastMode(mode);
  return (mode ?? lastMode) === 'guided' ? <GuidedRunScreen /> : <FreeRun />;
}

function FreeRun() {
  const { width, height } = useWindowDimensions();
  const runnerProfile = useRunnerProfile();
  const [mapRefresh, setMapRefresh] = useState(0);
  const [mapVisible, setMapVisible] = useState(false);
  const [musicVisible, setMusicVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [temperatureCelsius, setTemperatureCelsius] = useState<number | null>(null);
  const finishingRef = useRef(false);
  const holdProgress = useSharedValue(0);
  const distanceScale = useSharedValue(0.55);
  const { active, pause, resume, finish, busy, error } = useRunStore();
  const stopButtonScale = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + holdProgress.value * 0.55 }],
  }));
  const distanceAnimation = useAnimatedStyle(() => ({
    transform: [{ scale: distanceScale.value }],
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
    distanceScale.set(withSpring(1, { damping: 15, stiffness: 170 }));
  }, [distanceScale]);
  useEffect(() => {
    if (!mapVisible) return;
    const timer = setInterval(() => setMapRefresh((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, [mapVisible]);
  const runId = active?.id;
  useEffect(() => {
    if (!runId) return;
    let alive = true;
    async function refreshTemperature() {
      try {
        const points = getTrackPoints();
        const latest = points[points.length - 1];
        let coordinates = latest
          ? { latitude: latest.latitude, longitude: latest.longitude }
          : null;
        if (!coordinates) {
          const permission = await Location.getForegroundPermissionsAsync();
          if (!permission.granted) return;
          const known = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60_000 });
          if (known) coordinates = known.coords;
        }
        if (!coordinates) return;
        const latitude = coordinates.latitude.toFixed(3);
        const longitude = coordinates.longitude.toFixed(3);
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + latitude
          + '&longitude=' + longitude + '&current=temperature_2m&temperature_unit=celsius');
        if (!response.ok) return;
        const data = await response.json() as { current?: { temperature_2m?: number } };
        const temperature = data.current?.temperature_2m;
        if (alive && typeof temperature === 'number' && Number.isFinite(temperature)) {
          setTemperatureCelsius(Math.round(temperature));
        }
      } catch { /* Keep the last known temperature when location or network is unavailable. */ }
    }
    void refreshTemperature();
    const timer = setInterval(() => { void refreshTemperature(); }, 15 * 60_000);
    return () => { alive = false; clearInterval(timer); };
  }, [runId]);
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

  const distanceAreaSize = Math.round(Math.min(width - 48, height * 0.38, 330));
  const pace = active.distanceMeters >= 100
    ? active.movingSeconds / (active.distanceMeters / 1000) : null;
  const storedWeight = runnerProfile.data?.weightKg;
  const calories = estimateActiveCalories(active.activityType,
    typeof storedWeight === 'number' ? storedWeight : null, active.distanceMeters);
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
      <View accessibilityLabel={temperatureCelsius == null
        ? 'Météo, température indisponible'
        : 'Météo, ' + temperatureCelsius + ' degrés Celsius'}
        style={{ minHeight: 42, borderRadius: 22, backgroundColor: '#11191D',
          borderWidth: 1, borderColor: '#344331', paddingLeft: 6, paddingRight: 13,
          flexDirection: 'row', gap: 9, alignItems: 'center' }}>
        <View style={{ width: 29, height: 29, borderRadius: 15, backgroundColor: accent,
          alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="weather-partly-cloudy" size={17} color={ink} />
        </View>
        <View style={{ gap: 1 }}>
          <Text style={{ color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 }}>MÉTÉO</Text>
          <Text style={{ color: paper, fontSize: 14, fontFamily: fonts.monoBold,
            fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {temperatureCelsius == null ? '— °C' : temperatureCelsius + ' °C'}
          </Text>
        </View>
      </View>
      <View style={{ minHeight: 30, borderRadius: 16, backgroundColor: '#252E35',
        paddingHorizontal: 12, justifyContent: 'center' }}>
        <Text style={{ color: paper, fontSize: 10, fontWeight: '800' }}>
          {active.state === 'running' ? 'EN COURS' : 'EN PAUSE'}
        </Text>
      </View>
    </View>

    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      <View style={{ width: distanceAreaSize, height: distanceAreaSize,
        alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 5 }}>
          <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
            <Path d="m12 3 7 17-7-4-7 4 7-17Z" stroke={accent} strokeWidth={1.8}
              strokeLinejoin="round" />
          </Svg>
          <Animated.View style={[{ width: distanceAreaSize * 0.92, alignItems: 'center' }, distanceAnimation]}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: paper,
              fontSize: Math.min(distanceAreaSize * 0.26, 88), textAlign: 'center',
              fontFamily: fonts.monoBold, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
              {formatKm(active.distanceMeters)}
            </Text>
          </Animated.View>
          <Text style={{ color: '#A8B2B9', fontSize: 11, fontWeight: '700' }}>Distance (km)</Text>
        </View>
      </View>
      <View style={{ width: '100%', flexDirection: 'row', gap: 6,
        transform: [{ translateY: -48 }] }}>
        <Stat icon="pace" label="Allure / km" value={formatPace(pace) + '/km'} />
        <Stat icon="duration" label="Durée" value={formatDuration(active.elapsedSeconds)} />
        <Stat icon="calories" label="Kcal estimées" value={calories == null ? '— kcal' : calories + ' kcal'} />
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
