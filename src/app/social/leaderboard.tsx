import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/typography';
import { Eyebrow, Page, Panel, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { friendLeaderboard } from '@/services/competitions';
import { profilesByIds } from '@/services/friends';
import { formatKm } from '@/utils/format';

type Period = 'week' | 'month' | 'year';
function periodBounds(period: Period) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  else if (period === 'month') start.setDate(1);
  else { start.setMonth(0); start.setDate(1); }
  const end = new Date(start);
  if (period === 'week') end.setDate(end.getDate() + 7);
  else if (period === 'month') end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);
  return { start, end };
}
export default function LeaderboardScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [period, setPeriod] = useState<Period>('week');
  const [metric, setMetric] = useState<'distance' | 'runs'>('distance');
  const bounds = periodBounds(period);
  const board = useQuery({ queryKey: ['leaderboard', userId, period],
    queryFn: () => friendLeaderboard(bounds.start, bounds.end), enabled: !!userId });
  const ids = (board.data ?? []).map((row) => row.user_id);
  const profiles = useQuery({ queryKey: ['leaderboard-profiles', ids.join(',')],
    queryFn: () => profilesByIds(ids), enabled: ids.length > 0 });
  const sorted = [...(board.data ?? [])].sort((a, b) => metric === 'distance'
    ? b.distance_meters - a.distance_meters : b.run_count - a.run_count);
  return <Page><Eyebrow>TES AMIS UNIQUEMENT</Eyebrow><Title>Classement.</Title>
    <View style={{ flexDirection: 'row', gap: 8 }}>{(['week','month','year'] as const).map((item) =>
      <Pressable key={item} onPress={() => setPeriod(item)} style={{ padding: 12, borderRadius: 12,
        backgroundColor: period === item ? palette.accent : palette.surface }}>
        <Text style={{ color: period === item ? palette.accentText : palette.text, fontWeight: '800' }}>
          {item === 'week' ? 'SEMAINE' : item === 'month' ? 'MOIS' : 'ANNÉE'}</Text>
      </Pressable>)}</View>
    <View style={{ flexDirection: 'row', gap: 8 }}>{(['distance','runs'] as const).map((item) =>
      <Pressable key={item} onPress={() => setMetric(item)} style={{ padding: 12, borderRadius: 12,
        backgroundColor: metric === item ? palette.accent : palette.surface }}>
        <Text style={{ color: metric === item ? palette.accentText : palette.text, fontWeight: '800' }}>
          {item === 'distance' ? 'DISTANCE' : 'SORTIES'}</Text>
      </Pressable>)}</View>
    <Panel><Eyebrow>{period === 'week' ? 'CETTE SEMAINE' : period === 'month' ? 'CE MOIS' : 'CETTE ANNÉE'}</Eyebrow>
      {sorted.map((row, index) => <View key={row.user_id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ color: row.user_id === userId ? palette.accent : palette.text, fontWeight: '900', flex: 1 }}>
          {index + 1}. {row.user_id === userId ? 'Toi' :
            profiles.data?.find((profile) => profile.id === row.user_id)?.display_name ?? 'Ami'}</Text>
        <Text style={{ color: palette.text, fontWeight: '900' }}>
          {metric === 'distance' ? `${formatKm(row.distance_meters)} KM` : `${row.run_count} RUNS`}</Text>
      </View>)}
      {board.isError ? <Text style={{ color: palette.error }}>Classement indisponible. Vérifie ta connexion.</Text> : null}
    </Panel>
    <Text style={{ color: palette.muted }}>Tes sorties privées comptent pour toi. Les amis apparaissent avec les courses qu’ils ont choisi de partager.</Text>
  </Page>;
}
