import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Activity } from '@/types/domain';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import { palette } from '@/constants/palette';
export function ActivityTile({ activity }: { activity: Activity }) {
  return <Pressable onPress={() => router.push({ pathname: '/activity/[id]', params: { id: activity.id } })}
    style={({ pressed }) => ({ backgroundColor: palette.surface, borderRadius: 22, padding: 19,
      gap: 13, opacity: pressed ? 0.82 : 1 })}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: palette.text, fontWeight: '800', fontSize: 17 }}>{activity.title}</Text>
      <Text style={{ color: palette.muted, fontSize: 12 }}>{new Date(activity.startedAt).toLocaleDateString('fr-FR')}</Text>
    </View>
    <Text style={{ color: palette.accent, fontWeight: '900', fontSize: 31 }}>{formatKm(activity.distanceMeters)} KM</Text>
    <Text style={{ color: palette.muted }}>{formatDuration(activity.elapsedSeconds)}  ·  {formatPace(activity.averagePaceSecPerKm)} /km</Text>
    {activity.syncState === 'pending' ? <Text style={{ color: palette.orange, fontSize: 12 }}>En attente de synchronisation</Text> : null}
  </Pressable>;
}
