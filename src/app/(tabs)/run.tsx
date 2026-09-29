import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import * as Linking from 'expo-linking';
import MapView from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Switch, View } from 'react-native';
import { Text } from '@/components/typography';
import { Field, Page } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { useRunStore } from '@/store/run-store';
type MapCenter = { latitude: number; longitude: number };
type RunGoal = { distanceKm: string; targetTime: string };
const goalStorageKey = (userId: string) => `run-goal:${userId}`;
export default function Run() {
  const { session } = useAuth();
  const [autoPause, setAutoPause] = useState(true);
  const [gps, setGps] = useState('Recherche de ta position…');
  const [mapCenter, setMapCenter] = useState<MapCenter | null>(null);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalDistance, setGoalDistance] = useState('5');
  const [goalTime, setGoalTime] = useState('30:00');
  const [goalMessage, setGoalMessage] = useState('');
  const [goalSaved, setGoalSaved] = useState<RunGoal | null>(null);
  const [goalSavedForUser, setGoalSavedForUser] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [musicPickerVisible, setMusicPickerVisible] = useState(false);
  const { active, busy, error } = useRunStore();
  useEffect(() => {
    if (!session?.user.id) return;
    let alive = true;
    void AsyncStorage.getItem(goalStorageKey(session.user.id)).then((value) => {
      if (!alive) return;
      if (!value) {
        setGoalSaved(null);
        setGoalSavedForUser(session.user.id);
        return;
      }
      try {
        const parsed = JSON.parse(value) as RunGoal;
        if (typeof parsed.distanceKm === 'string' && typeof parsed.targetTime === 'string') {
          setGoalDistance(parsed.distanceKm);
          setGoalTime(parsed.targetTime);
          setGoalSaved(parsed);
          setGoalSavedForUser(session.user.id);
        }
      } catch { /* Ignore an outdated local goal value. */ }
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [session?.user.id]);
  useEffect(() => {
    let alive = true;
    async function locate() {
      try {
        if (!await Location.hasServicesEnabledAsync()) {
          if (alive) setGps('Active la localisation pour voir la carte');
          return;
        }
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!alive) return;
        if (!permission.granted) {
          setGps('Autorise la localisation pour voir la carte');
          return;
        }
        setLocationAllowed(true);
        const known = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 100 });
        if (alive && known) {
          setMapCenter({ latitude: known.coords.latitude, longitude: known.coords.longitude });
          setGps('Recherche du signal GPS précis…');
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (alive) {
          setMapCenter({ latitude: current.coords.latitude, longitude: current.coords.longitude });
          setGps(current.coords.accuracy == null
            ? 'Position GPS disponible' : `GPS ± ${Math.round(current.coords.accuracy)} m`);
        }
      } catch {
        if (alive) setGps('Position indisponible, réessaie à l’extérieur');
      }
    }
    void locate();
    return () => { alive = false; };
  }, []);
  async function beginRun() {
    if (active) { router.push('/run/active'); return; }
    if (!session?.user.id) return;
    router.push({ pathname: '/run/countdown', params: { type: 'running', autoPause: autoPause ? '1' : '0' } });
  }
  async function saveRunGoal() {
    const distance = Number(goalDistance.replace(',', '.'));
    const timeMatch = /^(\d{1,3}):([0-5]\d)$/.exec(goalTime.trim());
    const targetSeconds = timeMatch ? Number(timeMatch[1]) * 60 + Number(timeMatch[2]) : 0;
    if (!Number.isFinite(distance) || distance <= 0 || distance > 200 || !timeMatch || targetSeconds <= 0) {
      setGoalMessage('Entre une distance positive et un temps au format MM:SS.');
      return;
    }
    if (!session?.user.id) { setGoalMessage('Connecte-toi pour enregistrer cet objectif.'); return; }
    setSavingGoal(true);
    setGoalMessage('');
    const goal = { distanceKm: String(distance), targetTime: goalTime.trim() };
    try {
      await AsyncStorage.setItem(goalStorageKey(session.user.id), JSON.stringify(goal));
      setGoalSaved(goal);
      setGoalSavedForUser(session.user.id);
      setGoalModalVisible(false);
    } catch {
      setGoalMessage('Enregistrement impossible. Réessaie.');
    } finally { setSavingGoal(false); }
  }
  async function openMusicService(url: string) {
    setMusicPickerVisible(false);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Application indisponible', 'Impossible d’ouvrir ce service musical sur cet appareil.');
    }
  }
  return <Page scroll={false}>
    <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '900', letterSpacing: 2.5 }}>ÉLAN / BOUGER</Text>
          <Text style={{ color: palette.text, fontSize: 37, fontWeight: '900', letterSpacing: -1.5 }}>Run.</Text>
        </View>
        <GlassView isInteractive colorScheme="dark" tintColor="rgba(255,255,255,0.18)"
          style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Musique"
            hitSlop={8} onPress={() => setMusicPickerVisible(true)}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="music-note" size={21} color={palette.text} />
          </Pressable>
        </GlassView>
      </View>
    </View>

    <View style={{ flex: 1, backgroundColor: palette.bg, overflow: 'hidden' }}>
      {mapCenter ? <MapView style={{ flex: 1 }}
        region={{ ...mapCenter, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
        showsUserLocation={locationAllowed} showsMyLocationButton={false}
        scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false} />
        : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 35 }}>
          <Text style={{ color: palette.text, fontSize: 42 }}>◎</Text>
          <Text style={{ color: palette.text, textAlign: 'center', fontWeight: '800' }}>
            La carte apparaîtra dès que ta position sera disponible.
          </Text>
        </View>}

      <View style={{ position: 'absolute', top: 18, left: 20, right: 20,
        paddingHorizontal: 16, paddingVertical: 13, borderRadius: 20,
        backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line,
        flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }}>●  SIGNAL GPS</Text>
          <Text style={{ color: palette.text, fontSize: 13, fontWeight: '800' }}>{gps}</Text>
          <Text style={{ color: palette.muted, fontSize: 10 }}>Suivi pendant que l’app reste ouverte à l’écran</Text>
          {error ? <Text style={{ color: palette.error, fontSize: 11, fontWeight: '700' }}>{error}</Text> : null}
        </View>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Switch accessibilityLabel="Pause automatique" value={autoPause} onValueChange={setAutoPause}
            trackColor={{ false: palette.bg, true: palette.accent }}
            thumbColor={autoPause ? palette.bg : palette.accent} />
          <Text style={{ color: palette.muted, fontSize: 9, fontWeight: '800' }}>PAUSE AUTO</Text>
        </View>
      </View>

      <View style={{ position: 'absolute', bottom: 87, left: 0, right: 0,
        alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={active ? 'Voir la course en cours' : 'Démarrer la course'}
          disabled={busy} onPress={() => void beginRun()}
          style={({ pressed }) => ({ width: 128, height: 128, borderRadius: 64,
            backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center',
            borderWidth: 6, borderColor: palette.bg,
            transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
          <Text style={{ color: palette.accentText, fontSize: active ? 18 : 25, fontWeight: '900', letterSpacing: -0.4 }}>
            {active ? 'VOIR RUN' : busy ? 'GPS…' : 'START'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => {
          setGoalMessage('');
          setGoalModalVisible(true);
        }}
          style={({ pressed }) => ({ borderRadius: 22, backgroundColor: palette.bg,
            borderWidth: 1, borderColor: palette.line,
            paddingHorizontal: 22, paddingVertical: 11,
            transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Text style={{ color: palette.text, fontWeight: '900', fontSize: 12 }}>
            {goalSavedForUser === session?.user.id && goalSaved
              ? `OBJECTIF · ${goalSaved.distanceKm} KM / ${goalSaved.targetTime}` : 'DÉFINIR UN OBJECTIF'}
          </Text>
        </Pressable>
      </View>
    </View>
    <Modal visible={musicPickerVisible} transparent animationType="fade" statusBarTranslucent
      onRequestClose={() => setMusicPickerVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.78)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le choix musical"
          onPress={() => setMusicPickerVisible(false)}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <View style={{ width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF',
          borderRadius: 28, borderWidth: 1, borderColor: '#000000', padding: 22, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: '#000000', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>LECTEUR MUSICAL</Text>
              <Text style={{ color: '#000000', fontSize: 23, fontWeight: '900' }}>Tu écoutes où ?</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer"
              onPress={() => setMusicPickerVisible(false)}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#000000',
                alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="close" size={19} color="#FFFFFF" />
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void openMusicService('https://music.apple.com/')}
            style={({ pressed }) => ({ minHeight: 60, borderRadius: 18, borderWidth: 1,
              borderColor: '#000000', backgroundColor: '#FFFFFF', paddingHorizontal: 16,
              flexDirection: 'row', alignItems: 'center', gap: 14,
              transform: [{ scale: pressed ? 0.98 : 1 }] })}>
            <MaterialCommunityIcons name="apple" size={24} color="#000000" />
            <Text style={{ color: '#000000', fontSize: 15, fontWeight: '900' }}>Apple Music</Text>
            <MaterialCommunityIcons name="arrow-top-right" size={17} color="#000000" style={{ marginLeft: 'auto' }} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void openMusicService('https://open.spotify.com/')}
            style={({ pressed }) => ({ minHeight: 60, borderRadius: 18, borderWidth: 1,
              borderColor: '#000000', backgroundColor: '#000000', paddingHorizontal: 16,
              flexDirection: 'row', alignItems: 'center', gap: 14,
              transform: [{ scale: pressed ? 0.98 : 1 }] })}>
            <MaterialCommunityIcons name="spotify" size={24} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>Spotify</Text>
            <MaterialCommunityIcons name="arrow-top-right" size={17} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
          </Pressable>
        </View>
      </View>
    </Modal>
    <Modal visible={goalModalVisible} transparent animationType="slide" statusBarTranslucent
      onRequestClose={() => setGoalModalVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer les objectifs"
          onPress={() => setGoalModalVisible(false)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingTop: 14, paddingBottom: 36, gap: 16,
            borderWidth: 1, borderColor: '#000000' }}>
            <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: '#000000', alignSelf: 'center' }} />
            <View style={{ gap: 5 }}>
              <Text style={{ color: '#000000', fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>TON PROCHAIN DÉFI</Text>
              <Text style={{ color: '#000000', fontSize: 27, fontWeight: '900' }}>Fixe ton objectif.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: '#000000', fontSize: 12, fontWeight: '800' }}>DISTANCE · KM</Text>
                <Field accessibilityLabel="Distance cible en kilomètres" keyboardType="decimal-pad"
                  value={goalDistance} onChangeText={setGoalDistance} placeholder="5"
                  placeholderTextColor="#000000" style={{ color: '#000000', backgroundColor: '#FFFFFF', borderColor: '#000000' }} />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: '#000000', fontSize: 12, fontWeight: '800' }}>TEMPS CIBLE · MM:SS</Text>
                <Field accessibilityLabel="Temps cible en minutes et secondes" keyboardType="numbers-and-punctuation"
                  value={goalTime} onChangeText={setGoalTime} placeholder="30:00" maxLength={6}
                  placeholderTextColor="#000000" style={{ color: '#000000', backgroundColor: '#FFFFFF', borderColor: '#000000' }} />
              </View>
            </View>
            {goalMessage ? <Text style={{ color: '#000000', fontSize: 13, fontWeight: '700' }}>{goalMessage}</Text> : null}
            <Pressable accessibilityRole="button" disabled={savingGoal}
              onPress={() => void saveRunGoal()}
              style={({ pressed }) => ({ minHeight: 54, borderRadius: 18, backgroundColor: '#000000',
                alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed && !savingGoal ? 0.98 : 1 }] })}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>
                {savingGoal ? 'ENREGISTREMENT…' : 'ENREGISTRER MON OBJECTIF'}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setGoalModalVisible(false)}
              style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: '#000000', fontWeight: '800' }}>ANNULER</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  </Page>;
}
