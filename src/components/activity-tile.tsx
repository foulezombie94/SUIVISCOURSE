import { Pressable, View } from 'react-native';
import { Text } from '@/components/typography';
import { router } from 'expo-router';
import type { Activity } from '@/types/domain';
import { formatDuration, formatKm, formatPace } from '@/utils/format';
import { palette } from '@/constants/palette';
export function ActivityTile({ activity, inverted = false }: { activity: Activity; inverted?: boolean }) {
  const backgroundColor = inverted ? palette.accent : palette.surface;
  const textColor = inverted ? palette.bg : palette.text;
  return <Pressable onPress={() => router.push({ pathname: '/activity/[id]', params: { id: activity.id } })}
    style={({ pressed }) => ({ backgroundColor, borderColor: inverted ? palette.bg : palette.line,
      borderWidth: 1, borderRadius: 22, padding: 19, gap: 13,
      transform: [{ scale: pressed ? 0.99 : 1 }] })}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: textColor, fontWeight: '800', fontSize: 17 }}>{activity.title}</Text>
      <Text style={{ color: textColor, fontSize: 12 }}>{new Date(activity.startedAt).toLocaleDateString('fr-FR')}</Text>
    </View>
    <Text style={{ color: textColor, fontWeight: '900', fontSize: 31 }}>{formatKm(activity.distanceMeters)} KM</Text>
    <Text style={{ color: textColor }}>{formatDuration(activity.elapsedSeconds)}  ·  {formatPace(activity.averagePaceSecPerKm)} /km</Text>
    {activity.syncState === 'pending' ? <Text style={{ color: textColor, fontSize: 12 }}>En attente de synchronisation</Text> : null}
  </Pressable>;
}
