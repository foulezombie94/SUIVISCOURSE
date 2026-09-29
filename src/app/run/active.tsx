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
const electricBlue = '#00C8FF';

function Metric({ label, value, unit, height }: { label: string; value: string; unit: string; height: number }) {
  return <View style={{ flex: 1, minWidth: 0, height, borderRadius: 18,
    paddingVertical: 13, paddingHorizontal: 13, justifyContent: 'space-between', backgroundColor: ink }}>
    <Text numberOfLines={1} style={{ color: paper, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }}>{label}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
      style={{ color: paper, fontSize: 25, fontFamily: fonts.monoBold }}>{value}</Text>
    <Text numberOfLines={1} style={{ color: paper, fontSize: 10, fontWeight: '800' }}>{unit}</Text>
  </View>;
}

export default function ActiveRun() {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 28 - 9) / 2;
  const cardHeight = Math.round(Math.min(140, Math.max(90, cardWidth * 0.75)));
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
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: ink }}>
      {trackPoints.length > 0
        ? <RouteMap points={trackPoints} refreshToken={mapRefresh} followCurrent fill />
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

    <View style={{ position: 'absolute', left: 14, right: 14, bottom: 12, gap: 9 }}>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <Metric label="TEMPS" value={formatDuration(active.elapsedSeconds)} unit="MIN" height={cardHeight} />
        <Metric label="VITESSE" value={speed.toFixed(0)} unit="KM/H" height={cardHeight} />
      </View>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <Metric label="DISTANCE" value={active.distanceMeters < 1000
          ? `${Math.round(active.distanceMeters)}` : formatKm(active.distanceMeters)}
          unit={active.distanceMeters < 1000 ? 'M' : 'KM'} height={cardHeight} />
        <Pressable accessibilityRole="button" accessibilityLabel="Terminer la course"
          disabled={busy} onPress={finishRun}
          style={({ pressed }) => ({ flex: 1, height: cardHeight,
            borderRadius: 18, backgroundColor: electricBlue, alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed && !busy ? 0.98 : 1 }] })}>
          <Text style={{ color: ink, fontSize: 19, fontWeight: '900', letterSpacing: 1.2 }}>STOP ■</Text>
        </Pressable>
      </View>
      {error ? <Text style={{ color: paper, backgroundColor: ink, padding: 8,
        fontSize: 12, fontWeight: '800', textAlign: 'center' }}>{error}</Text> : null}
    </View>
  </SafeAreaView>;
}
