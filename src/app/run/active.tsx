import { memo, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Alert, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Button, Eyebrow, Page, Panel } from '@/components/ui';
import { RouteMap } from '@/components/route-map';
import { palette } from '@/constants/palette';
import { getTrackPoints, useRunStore } from '@/store/run-store';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import type { Point } from '@/types/domain';

const MapPage = memo(function MapPage({ points, width, routeVersion }: {
  points: Point[]; width: number; routeVersion: number;
}) {
  return <View style={{ width, paddingHorizontal: 24, gap: 15 }}>
    <Eyebrow>TON PARCOURS</Eyebrow>
    {routeVersion ? <RouteMap points={points} height={355} /> :
      <Text style={{ color: palette.muted }}>En attente du premier point GPS…</Text>}
  </View>;
});
export default function ActiveRun() {
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const { active, routeVersion, pause, resume, finish, busy, error } = useRunStore();
  if (!active) return <Redirect href="/(tabs)/run" />;
  const pace = active.distanceMeters >= 100 ? active.movingSeconds / (active.distanceMeters / 1000) : null;
  const speed = active.movingSeconds > 0 ? active.distanceMeters / active.movingSeconds * 3.6 : 0;
  const panels = ['STATS', 'CARTE', 'SPLITS', 'PERFORMANCE'];
  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  return <Page scroll={false} bottom>
    <View style={{ padding: 24, paddingTop: 15, gap: 12 }}>
      <Eyebrow>{active.state === 'autoPaused' ? 'AUTO PAUSE' : active.state === 'paused' ? 'EN PAUSE' : 'EN COURS ●'}</Eyebrow>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {panels.map((name, index) => <Text key={name} onPress={() => scroller.current?.scrollTo({ x: index * width, animated: true })}
          style={{ color: index === page ? palette.accent : palette.muted, fontSize: 10,
            fontWeight: '900', padding: 8 }}>{name}</Text>)}
      </View>
    </View>
    <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={onScrollEnd} style={{ flexGrow: 0 }}>
      <View style={{ width, paddingHorizontal: 24, gap: 13 }}>
        <Panel style={{ alignItems: 'center', paddingVertical: 26 }}>
          <Text style={{ color: palette.muted, letterSpacing: 2, fontWeight: '800' }}>DISTANCE</Text>
          <Text style={{ color: palette.accent, fontSize: 72, fontWeight: '900', letterSpacing: -4 }} adjustsFontSizeToFit numberOfLines={1}>{formatKm(active.distanceMeters)}</Text>
          <Text style={{ color: palette.text, fontWeight: '800' }}>KM</Text>
        </Panel>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Panel style={{ flex: 1 }}><Text style={{ color: palette.muted }}>TEMPS</Text>
            <Text style={{ color: palette.text, fontSize: 28, fontWeight: '900' }}>{formatDuration(active.elapsedSeconds)}</Text></Panel>
          <Panel style={{ flex: 1 }}><Text style={{ color: palette.muted }}>ALLURE</Text>
            <Text style={{ color: palette.text, fontSize: 28, fontWeight: '900' }}>{formatPace(pace)}</Text></Panel>
        </View>
      </View>
      <MapPage points={getTrackPoints()} routeVersion={page === 1 ? routeVersion : 0} width={width} />
      <View style={{ width, paddingHorizontal: 24, gap: 12 }}><Eyebrow>KILOMÈTRES</Eyebrow>
        {active.splits.length ? active.splits.map((split) => <Panel key={split.kilometer}
          style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: palette.text, fontWeight: '800' }}>KM {split.kilometer}</Text>
          <Text style={{ color: palette.accent, fontWeight: '900' }}>{formatDuration(split.movingSeconds)}</Text>
        </Panel>) : <Text style={{ color: palette.muted }}>Le premier split apparaîtra à 1 km.</Text>}
      </View>
      <View style={{ width, paddingHorizontal: 24, gap: 12 }}><Eyebrow>PERFORMANCE</Eyebrow>
        <Panel><Text style={{ color: palette.muted }}>TEMPS EN MOUVEMENT</Text><Text style={{ color: palette.text, fontSize: 31, fontWeight: '900' }}>{formatDuration(active.movingSeconds)}</Text></Panel>
        <Panel><Text style={{ color: palette.muted }}>VITESSE MOYENNE</Text><Text style={{ color: palette.text, fontSize: 31, fontWeight: '900' }}>{speed.toFixed(1)} KM/H</Text></Panel>
        <Panel><Text style={{ color: palette.muted }}>DÉNIVELÉ POSITIF</Text><Text style={{ color: palette.text, fontSize: 31, fontWeight: '900' }}>+{Math.round(active.elevationGainMeters)} M</Text></Panel>
      </View>
    </ScrollView>
    <View style={{ flex: 1 }} />
    <View style={{ padding: 24, gap: 10, backgroundColor: palette.bg }}>
      {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
      <Button label={active.state === 'paused' ? 'REPRENDRE' : 'PAUSE'} tone={active.state === 'paused' ? 'accent' : 'muted'}
        onPress={() => active.state === 'paused' ? void resume() : void pause()} />
      <Button label={busy ? 'SAUVEGARDE…' : 'TERMINER'} tone="danger" disabled={busy}
        onPress={() => Alert.alert('Terminer la course ?', 'Le résumé sera sauvegardé sur ton téléphone.',
          [{ text: 'Continuer', style: 'cancel' }, { text: 'Terminer', onPress: async () => {
            const saved = await finish();
            if (saved) router.replace({ pathname: '/run/summary', params: { id: saved.id } });
          } }])} />
    </View>
  </Page>;
}
