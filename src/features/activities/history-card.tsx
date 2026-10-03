import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/typography';
import type { Activity } from '@/types/domain';
import { formatDuration, formatKm, formatPace } from '@/utils/format';

const ink = '#000000';
const muted = '#6C6C6C';

export function HistoryCard({ activity, isFavorite, onFavorite, favoriteDisabled }: {
  activity: Activity; isFavorite: boolean; onFavorite: () => void; favoriteDisabled?: boolean;
}) {
  const date = new Date(activity.startedAt);
  const pace = activity.averagePaceSecPerKm ?? (activity.distanceMeters > 0
    ? activity.movingSeconds / activity.distanceMeters * 1000 : null);
  const type = activity.activityType === 'walking' ? 'Marche'
    : activity.activityType === 'trail' ? 'Trail' : 'Course';
  return <View style={{ marginHorizontal: 24, marginBottom: 12 }}>
    <Pressable accessibilityRole="button"
    accessibilityLabel={`${activity.title}, ${date.toLocaleDateString('fr-FR')}, ${formatKm(activity.distanceMeters)} kilomètres`}
    onPress={() => router.push({ pathname: '/activity/[id]', params: { id: activity.id } })}
    style={({ pressed }) => ({ padding: 17,
      borderRadius: 21, backgroundColor: pressed ? '#F8F8F8' : '#FFFFFF',
      borderWidth: 1, borderColor: '#EAEAEA', gap: 19 })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 40 }}>
      <View style={{ width: 47, height: 53, borderRadius: 13, backgroundColor: '#F5F5F5',
        alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: ink, fontSize: 23, fontWeight: '700', lineHeight: 27 }}>{date.getDate()}</Text>
        <Text style={{ color: muted, fontSize: 10, textTransform: 'uppercase' }}>
          {date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</Text>
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text numberOfLines={1} style={{ color: ink, fontSize: 16, fontWeight: '700' }}>{activity.title || type}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <MaterialCommunityIcons name={activity.activityType === 'walking' ? 'walk'
            : activity.activityType === 'trail' ? 'terrain' : 'run-fast'} size={14} color={muted} />
          <Text style={{ color: muted, fontSize: 11 }}>{type} · {date.toLocaleTimeString('fr-FR', {
            hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {[
        { value: formatKm(activity.distanceMeters), label: 'Distance · km', large: true },
        { value: formatDuration(activity.elapsedSeconds), label: 'Durée', large: false },
        { value: formatPace(pace), label: 'Allure · min/km', large: false },
      ].map((metric, index) => <View key={metric.label} style={{ flex: 1, minWidth: 0, gap: 4,
        paddingLeft: index ? 12 : 0, borderLeftWidth: index ? 1 : 0, borderLeftColor: '#EEEEEE' }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: ink, fontSize: metric.large ? 28 : 21,
          fontWeight: metric.large ? '800' : '600', letterSpacing: -0.7,
          fontVariant: ['tabular-nums'] }}>{metric.value}</Text>
        <Text style={{ color: muted, fontSize: 10 }}>{metric.label}</Text>
      </View>)}
    </View>
    {activity.syncState === 'pending' || activity.verificationStatus === 'suspicious'
      ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialCommunityIcons name={activity.verificationStatus === 'suspicious'
          ? 'alert-circle-outline' : 'cloud-upload-outline'} size={14} color={muted} />
        <Text style={{ color: muted, fontSize: 11 }}>{activity.verificationStatus === 'suspicious'
          ? 'Données GPS à vérifier' : 'Synchronisation en attente'}</Text>
      </View> : null}
    </Pressable>
    <Pressable accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      accessibilityState={{ selected: isFavorite, disabled: favoriteDisabled }}
      disabled={favoriteDisabled} onPress={onFavorite}
      style={({ pressed }) => ({ position: 'absolute', top: 20, right: 13,
        width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
        backgroundColor: isFavorite ? '#B9F532' : '#F5F5F5', opacity: pressed || favoriteDisabled ? 0.6 : 1 })}>
      <MaterialCommunityIcons name={isFavorite ? 'star' : 'star-outline'} size={23} color={ink} />
    </Pressable>
  </View>;
}
