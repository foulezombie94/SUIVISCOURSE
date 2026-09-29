import { useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/typography';
import { Button, Eyebrow, Page, Title } from '@/components/ui';
import { RouteArt } from '@/components/route-art';
import { palette } from '@/constants/palette';
import { fonts } from '@/constants/typography';
import { useAuth } from '@/features/auth/auth-provider';
import { getActivity } from '@/services/activities';
import { formatDuration, formatKm, formatPace } from '@/utils/format';

const formats = { '9:16': 568, '1:1': 320, '4:5': 400 } as const;
const styles = {
  NOIR: { background: '#000000', text: '#FFFFFF', accent: '#FFFFFF' },
  BLANC: { background: '#FFFFFF', text: '#000000', accent: '#000000' },
} as const;
export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const query = useQuery({ queryKey: ['activity', userId, id],
    queryFn: () => getActivity(userId, id ?? ''), enabled: !!userId && !!id });
  const [format, setFormat] = useState<keyof typeof formats>('9:16');
  const [styleName, setStyleName] = useState<keyof typeof styles>('NOIR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<View>(null);
  if (query.isPending) return <Page><ActivityIndicator color={palette.accent} /></Page>;
  const activity = query.data;
  if (!activity) return <Page><Title>Activité introuvable.</Title></Page>;
  const theme = styles[styleName];
  async function share() {
    if (!ref.current) return;
    setBusy(true); setError('');
    let uri: string | null = null;
    try {
      if (!await Sharing.isAvailableAsync()) throw new Error('Le partage n’est pas disponible sur cet appareil.');
      uri = await captureRef(ref.current, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de partager cette carte.');
    } finally {
      if (uri) { try { new File(uri).delete(); } catch { /* cache is temporary */ } }
      setBusy(false);
    }
  }
  return <Page><Eyebrow>UNE COURSE, UNE IMAGE</Eyebrow><Title>Ta Run Card.</Title>
    <View style={{ flexDirection: 'row', gap: 9 }}>
      {(Object.keys(formats) as (keyof typeof formats)[]).map((item) => <Pressable key={item}
        onPress={() => setFormat(item)} style={{ padding: 12, borderRadius: 12,
          borderWidth: 1, borderColor: palette.line,
          backgroundColor: item === format ? palette.accent : palette.surface }}>
        <Text style={{ color: item === format ? palette.accentText : palette.text, fontWeight: '800' }}>{item}</Text>
      </Pressable>)}
    </View>
    <View style={{ flexDirection: 'row', gap: 9 }}>
      {(Object.keys(styles) as (keyof typeof styles)[]).map((item) => <Pressable key={item}
        onPress={() => setStyleName(item)} style={{ padding: 12, borderRadius: 12,
          borderWidth: 1, borderColor: palette.line,
          backgroundColor: item === styleName ? palette.accent : palette.surface }}>
        <Text style={{ color: item === styleName ? palette.accentText : palette.text, fontWeight: '800' }}>{item}</Text>
      </Pressable>)}
    </View>
    <View ref={ref} collapsable={false} style={{ width: 320, height: formats[format],
      backgroundColor: theme.background, borderRadius: 24, padding: 23, justifyContent: 'space-between',
      alignSelf: 'center', overflow: 'hidden' }}>
      <Text style={{ color: theme.accent, fontWeight: '900', fontSize: 26 }}>ÉLAN /</Text>
      <View>
        <Text style={{ color: theme.text, letterSpacing: 2 }}>RUN DIFFERENT</Text>
        <Text style={{ color: theme.text, fontSize: 56, fontFamily: fonts.monoBold, fontWeight: '700' }}>{formatKm(activity.distanceMeters)}</Text>
        <Text style={{ color: theme.accent, fontWeight: '900', fontSize: 21 }}>KM</Text>
      </View>
      <RouteArt points={activity.points} hideRadiusMeters={activity.hideRadiusMeters} color={theme.accent} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.text, fontFamily: fonts.monoBold, fontWeight: '700' }}>{formatDuration(activity.elapsedSeconds)}</Text>
        <Text style={{ color: theme.text, fontFamily: fonts.monoBold, fontWeight: '700' }}>{formatPace(activity.averagePaceSecPerKm)} /KM</Text>
      </View>
      <Text style={{ color: theme.text, fontSize: 11 }}>Départ et arrivée masqués sur cette carte</Text>
    </View>
    {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
    <Button label={busy ? 'PRÉPARATION…' : 'PARTAGER L’IMAGE'} disabled={busy} onPress={share} />
  </Page>;
}
