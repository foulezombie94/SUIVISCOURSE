import { useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Text } from '@/components/typography';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '@/components/route-map';
import { getTrackPoints, useRunStore } from '@/store/run-store';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import { fonts } from '@/constants/typography';

const paper = '#FFFFFF';
const ink = '#000000';
const pages = ['DISTANCE', 'CARTE', 'SPLITS'];

export default function ActiveRun() {
  const { width, height } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const { active, routeVersion, pause, resume, finish, busy, error } = useRunStore();
  if (!active) return <Redirect href="/(tabs)/run" />;
  const pace = active.distanceMeters >= 100 ? active.movingSeconds / (active.distanceMeters / 1000) : null;
  const speed = active.movingSeconds > 0 ? active.distanceMeters / active.movingSeconds * 3.6 : 0;
  const stateLabel = active.state === 'autoPaused' ? 'PAUSE AUTO' :
    active.state === 'paused' ? 'EN PAUSE' : 'EN COURS';
  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  const finishRun = () => Alert.alert('Terminer la course ?', 'Le résumé sera sauvegardé sur ton téléphone.',
    [{ text: 'Continuer', style: 'cancel' }, { text: 'Terminer', onPress: async () => {
      const saved = await finish();
      if (saved) router.replace({ pathname: '/run/summary', params: { id: saved.id } });
    } }]);

  return <SafeAreaView style={{ flex: 1, backgroundColor: paper }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <View style={{ paddingHorizontal: 24, paddingTop: 14, gap: 26 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: ink, fontSize: 13, fontWeight: '900', letterSpacing: 2.2 }}>ÉLAN / LIVE</Text>
        <View style={{ backgroundColor: ink, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 7 }}>
          <Text style={{ color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }}>●  {stateLabel}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: ink, fontSize: 29, fontFamily: fonts.monoBold, fontVariant: ['tabular-nums'] }}>
            {formatDuration(active.elapsedSeconds)}</Text>
          <Text style={{ color: ink, fontSize: 12, fontWeight: '800' }}>TEMPS</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: ink, fontSize: 29, fontFamily: fonts.monoBold, fontVariant: ['tabular-nums'] }}>
            {formatPace(pace)}</Text>
          <Text style={{ color: ink, fontSize: 12, fontWeight: '800' }}>ALLURE / KM</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ color: ink, fontSize: 29, fontFamily: fonts.monoBold, fontVariant: ['tabular-nums'] }}>
            +{Math.round(active.elevationGainMeters)}</Text>
          <Text style={{ color: ink, fontSize: 12, fontWeight: '800' }}>DÉNIVELÉ M</Text>
        </View>
      </View>
    </View>

    <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={onScrollEnd} style={{ flex: 1 }}>
      <View style={{ width, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: ink, fontSize: Math.min(width * 0.3, 124), fontFamily: fonts.monoBold,
          letterSpacing: -6, fontVariant: ['tabular-nums'], textAlign: 'center' }}
          adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1}>
          {formatKm(active.distanceMeters)}
        </Text>
        <Text style={{ color: ink, fontSize: 20, fontWeight: '900', letterSpacing: 1.5 }}>KILOMÈTRES</Text>
        <View style={{ width: '85%', height: 8, borderRadius: 4, borderWidth: 1,
          borderColor: ink, backgroundColor: paper, marginTop: 55 }}>
          <View style={{ width: `${(active.distanceMeters % 1000) / 10}%`, height: 6,
            borderRadius: 3, backgroundColor: ink }} />
        </View>
        <Text style={{ color: ink, fontSize: 10, fontWeight: '800', marginTop: 10 }}>
          PROCHAIN KILOMÈTRE
        </Text>
      </View>
      <View style={{ width, justifyContent: 'center', paddingHorizontal: 24, gap: 15 }}>
        <Text style={{ color: ink, fontSize: 22, fontWeight: '900' }}>Ton parcours.</Text>
        {page === 1 && routeVersion ? <RouteMap points={getTrackPoints()} height={Math.min(height * 0.4, 340)} /> :
          <View style={{ height: Math.min(height * 0.4, 340), borderRadius: 22,
            borderWidth: 1, borderColor: ink, backgroundColor: paper,
            alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: ink, fontWeight: '800' }}>Recherche du tracé GPS…</Text>
          </View>}
        <Text style={{ color: ink, fontSize: 12, fontWeight: '700' }}>Ton tracé détaillé reste privé.</Text>
      </View>
      <ScrollView style={{ width }} contentContainerStyle={{ padding: 24, gap: 12 }}>
        <Text style={{ color: ink, fontSize: 22, fontWeight: '900' }}>Tes kilomètres.</Text>
        <View style={{ padding: 18, borderRadius: 20, borderWidth: 1, borderColor: ink, gap: 5 }}>
          <Text style={{ color: ink, fontSize: 11, fontWeight: '900' }}>TEMPS EN MOUVEMENT</Text>
          <Text style={{ color: ink, fontSize: 30, fontFamily: fonts.monoBold }}>{formatDuration(active.movingSeconds)}</Text>
        </View>
        <View style={{ padding: 18, borderRadius: 20, borderWidth: 1, borderColor: ink, gap: 5 }}>
          <Text style={{ color: ink, fontSize: 11, fontWeight: '900' }}>VITESSE MOYENNE</Text>
          <Text style={{ color: ink, fontSize: 30, fontFamily: fonts.monoBold }}>{speed.toFixed(1)} KM/H</Text>
        </View>
        {active.splits.length ? active.splits.map((split) =>
          <View key={split.kilometer} style={{ padding: 16, borderRadius: 17,
            borderWidth: 1, borderColor: ink, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: ink, fontWeight: '900' }}>KM {split.kilometer}</Text>
            <Text style={{ color: ink, fontWeight: '900' }}>{formatDuration(split.movingSeconds)}</Text>
          </View>) : <Text style={{ color: ink, fontWeight: '700' }}>Premier split à 1 km.</Text>}
      </ScrollView>
    </ScrollView>

    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 15, gap: 15 }}>
      {error ? <Text style={{ color: ink, fontWeight: '800', textAlign: 'center' }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={active.state === 'running' ? 'Mettre en pause' : 'Reprendre'}
        disabled={busy} onPress={() => active.state === 'running' ? void pause() : void resume()}
        style={({ pressed }) => ({ width: 98, height: 98, borderRadius: 49, backgroundColor: ink,
          alignItems: 'center', justifyContent: 'center',
          transform: [{ scale: pressed && !busy ? 0.96 : 1 }] })}>
        {active.state === 'running' ? <View style={{ flexDirection: 'row', gap: 9 }}>
          <View style={{ width: 9, height: 35, borderRadius: 3, backgroundColor: paper }} />
          <View style={{ width: 9, height: 35, borderRadius: 3, backgroundColor: paper }} />
        </View> : <Text style={{ color: paper, fontSize: 38, marginLeft: 5 }}>▶</Text>}
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {pages.map((name, index) => <Pressable key={name} accessibilityRole="button"
          accessibilityLabel={name} accessibilityState={{ selected: page === index }}
          onPress={() => scroller.current?.scrollTo({ x: index * width, animated: true })}
          style={{ width: page === index ? 23 : 8, height: 8, borderRadius: 4,
            borderWidth: page === index ? 0 : 1, borderColor: ink,
            backgroundColor: page === index ? ink : paper }} />)}
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={finishRun}
        style={({ pressed }) => ({ alignSelf: 'stretch', borderRadius: 20, backgroundColor: ink,
          paddingVertical: 15, paddingHorizontal: 20, flexDirection: 'row',
          alignItems: 'center', justifyContent: 'space-between',
          transform: [{ scale: pressed && !busy ? 0.98 : 1 }] })}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 }}>ÉLAN / SESSION</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
            {busy ? 'Sauvegarde en cours…' : 'Terminer la course'}
          </Text>
        </View>
        <Text style={{ color: paper, fontSize: 25, fontWeight: '800' }}>→</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
}
