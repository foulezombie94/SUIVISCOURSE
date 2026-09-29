import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Panel } from '@/components/ui';
import { palette } from '@/constants/palette';
import type { FeedItem } from '@/services/feed';
import { formatKm } from '@/utils/format';

export function FriendActivityTile({ item }: { item: FeedItem }) {
  const { activity, author } = item;
  return <Panel>
    <Text style={{ color: palette.accent, fontWeight: '900' }}>
      {author?.display_name ?? 'Ami'} · @{author?.username ?? 'runner'}</Text>
    <Text style={{ color: palette.text, fontSize: 27, fontWeight: '900' }}>
      {formatKm(activity.distance_meters)} KM</Text>
    <Text style={{ color: palette.muted }}>
      {activity.title} · {new Date(activity.started_at).toLocaleDateString('fr-FR')}</Text>
    {activity.run_score != null ? <Text style={{ color: palette.accent }}>RUN SCORE {activity.run_score}</Text> : null}
    <Button label="VOIR LA COURSE" tone="muted" onPress={() => router.push({
      pathname: '/activity/[id]', params: { id: activity.activity_id },
    })} />
  </Panel>;
}
