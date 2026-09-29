import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView from 'react-native-maps';
import { Pressable, Switch, View } from 'react-native';
import { Text } from '@/components/typography';
import { Page } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { useRunStore } from '@/store/run-store';
type MapCenter = { latitude: number; longitude: number };
export default function Run() {
  const { session } = useAuth();
  const [autoPause, setAutoPause] = useState(true);
  const [gps, setGps] = useState('Recherche de ta position…');
  const [mapCenter, setMapCenter] = useState<MapCenter | null>(null);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const { active, busy, error } = useRunStore();
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
  return <Page scroll={false}>
    <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 18, gap: 18 }}>
      <View style={{ gap: 2 }}>
        <Text style={{ color: palette.accent, fontSize: 11, fontWeight: '900', letterSpacing: 2.5 }}>ÉLAN / BOUGER</Text>
        <Text style={{ color: palette.text, fontSize: 37, fontWeight: '900', letterSpacing: -1.5 }}>Run.</Text>
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

      <View style={{ position: 'absolute', bottom: 150, left: 0, right: 0,
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
        <Pressable accessibilityRole="button" onPress={() => router.push('/goals')}
          style={({ pressed }) => ({ borderRadius: 22, backgroundColor: palette.bg,
            borderWidth: 1, borderColor: palette.line,
            paddingHorizontal: 22, paddingVertical: 11,
            transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Text style={{ color: palette.text, fontWeight: '900', fontSize: 12 }}>DÉFINIR UN OBJECTIF</Text>
        </Pressable>
      </View>
    </View>
  </Page>;
}
