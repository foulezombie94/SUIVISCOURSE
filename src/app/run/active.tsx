import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, View, useWindowDimensions } from 'react-native';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '@/components/route-map';
import { getTrackPoints, useRunStore } from '@/store/run-store';
import { formatDuration, formatKm } from '@/utils/format';
import { fonts } from '@/constants/typography';

const ink = '#000000';
const paper = '#FFFFFF';

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: ink,
    borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, gap: 5,
    backgroundColor: paper }}>
    <Text numberOfLines={1} style={{ color: ink, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
      style={{ color: ink, fontSize: 20, fontFamily: fonts.monoBold }}>{value}</Text>
  </View>;
}

export default function ActiveRun() {
  const { height } = useWindowDimensions();
  const [mapRefresh, setMapRefresh] = useState(0);
  const { active, pause, resume, finish, busy, error } = useRunStore();
  useEffect(() => {
    const timer = setInterval(() => setMapRefresh((value) => value + 1), 5000);
    return () => clearInterval(timer);
  }, []);
  if (!active) return <Redirect href="/(tabs)/run" />;

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
    <View style={{ height: Math.min(height * 0.53, 480), backgroundColor: ink }}>
      {trackPoints.length > 0
        ? <RouteMap points={trackPoints} height={Math.min(height * 0.53, 480)} refreshToken={mapRefresh} followCurrent />
        : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ color: paper, fontSize: 38 }}>◎</Text>
          <Text style={{ color: paper, fontWeight: '800' }}>Recherche du tracé GPS…</Text>
        </View>}
      <View style={{ position: 'absolute', top: 10, right: 16 }}>
        <Pressable accessibilityRole="button"
          accessibilityLabel={active.state === 'running' ? 'Mettre en pause' : 'Reprendre la course'}
          disabled={busy} onPress={() => active.state === 'running' ? void pause() : void resume()}
          style={({ pressed }) => ({ width: 44, height: 44, backgroundColor: paper,
            borderRadius: 22, borderWidth: 1, borderColor: ink,
            alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
          <Text style={{ color: ink, fontSize: 19, fontWeight: '900' }}>
            {active.state === 'running' ? 'Ⅱ' : '▶'}
          </Text>
        </Pressable>
      </View>
    </View>

    <View style={{ flex: 1, backgroundColor: ink, borderTopLeftRadius: 26, borderTopRightRadius: 26,
      marginTop: -20, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10, gap: 9 }}>
      <View style={{ flexDirection: 'row', gap: 9, flex: 1 }}>
        <Metric label="TEMPS" value={formatDuration(active.elapsedSeconds)} />
        <Metric label="VITESSE" value={`${speed.toFixed(0)} KM/H`} />
      </View>
      <View style={{ flexDirection: 'row', gap: 9, flex: 1 }}>
        <Metric label="DISTANCE" value={active.distanceMeters < 1000
          ? `${Math.round(active.distanceMeters)} M` : `${formatKm(active.distanceMeters)} KM`} />
        <Pressable accessibilityRole="button" accessibilityLabel="Terminer la course"
          disabled={busy} onPress={finishRun}
          style={({ pressed }) => ({ flex: 1, borderWidth: 1, borderColor: paper,
            borderRadius: 14, backgroundColor: paper, alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed && !busy ? 0.98 : 1 }] })}>
          <Text style={{ color: ink, fontSize: 17, fontWeight: '900', letterSpacing: 1.2 }}>STOP ■</Text>
        </Pressable>
      </View>
      {error ? <Text style={{ color: paper, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>{error}</Text> : null}
    </View>
  </SafeAreaView>;
}
