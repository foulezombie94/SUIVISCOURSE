import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Pressable, Switch, Text, View } from 'react-native';
import { Button, Eyebrow, Page, Panel, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { useRunStore } from '@/store/run-store';
import type { ActivityType } from '@/types/domain';

const choices: { value: ActivityType; label: string }[] = [
  { value: 'running', label: 'RUNNING' }, { value: 'walking', label: 'MARCHE' },
  { value: 'trail', label: 'TRAIL' },
];
export default function Run() {
  const { session } = useAuth();
  const [type, setType] = useState<ActivityType>('running');
  const [autoPause, setAutoPause] = useState(true);
  const [gps, setGps] = useState('Vérification du GPS…');
  const { active, busy, error, start } = useRunStore();
  useEffect(() => {
    let alive = true;
    void Promise.all([Location.hasServicesEnabledAsync(), Location.getForegroundPermissionsAsync()])
      .then(async ([enabled, permission]) => {
        if (!alive) return;
        if (!enabled) setGps('Localisation désactivée');
        else if (!permission.granted) setGps('Autorisation demandée au départ');
        else {
          const known = await Location.getLastKnownPositionAsync();
          if (alive) setGps(known?.coords.accuracy != null
            ? `GPS ± ${Math.round(known.coords.accuracy)} m` : 'GPS disponible');
        }
      }).catch(() => { if (alive) setGps('GPS indisponible'); });
    return () => { alive = false; };
  }, []);
  return <Page><Eyebrow>LE POINT DE DÉPART</Eyebrow><Title>Prêt à bouger ?</Title>
    <Panel style={{ paddingVertical: 30, alignItems: 'center', gap: 8 }}>
      <Text style={{ color: palette.accent, fontSize: 13, fontWeight: '900', letterSpacing: 2 }}>GPS ●</Text>
      <Text style={{ color: palette.text, fontSize: 21, fontWeight: '800' }}>{gps}</Text>
      <Text style={{ color: palette.muted, textAlign: 'center', lineHeight: 21 }}>Le suivi GPS fonctionne dans Expo Go tant que l’app reste ouverte à l’écran.</Text>
    </Panel>
    <Eyebrow>ACTIVITÉ</Eyebrow>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {choices.map((choice) => <Pressable key={choice.value} onPress={() => setType(choice.value)}
        style={{ flex: 1, paddingVertical: 17, alignItems: 'center', borderRadius: 16,
          backgroundColor: type === choice.value ? palette.accent : palette.surface }}>
        <Text style={{ color: type === choice.value ? palette.accentText : palette.text,
          fontSize: 12, fontWeight: '900' }}>{choice.label}</Text>
      </Pressable>)}
    </View>
    <Panel style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View><Text style={{ color: palette.text, fontWeight: '800' }}>Pause automatique</Text>
        <Text style={{ color: palette.muted, fontSize: 12 }}>Quand tu t’arrêtes vraiment</Text></View>
      <Switch value={autoPause} onValueChange={setAutoPause} trackColor={{ true: palette.accent }} />
    </Panel>
    {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
    <Button label={active ? 'REPRENDRE LA COURSE' : busy ? 'PRÉPARATION DU GPS…' : 'DÉMARRER'}
      disabled={busy} onPress={async () => {
        if (active) { router.push('/run/active'); return; }
        if (!session?.user.id) return;
        if (await start(session.user.id, type, autoPause)) router.push('/run/active');
      }} />
  </Page>;
}
