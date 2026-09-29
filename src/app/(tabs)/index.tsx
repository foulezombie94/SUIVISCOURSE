import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { ActivityTile } from '@/components/activity-tile';
import { FriendActivityTile } from '@/components/friend-activity-tile';
import { Button, Empty, Eyebrow, Page, Panel, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { listActivities } from '@/services/activities';
import { getMyProfile } from '@/services/friends';
import { listFriendFeed } from '@/services/feed';
import { listNotifications } from '@/services/notifications';
import { formatKm } from '@/utils/format';

export default function Home() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const profile = useQuery({ queryKey: ['profile', userId], queryFn: () => getMyProfile(userId), enabled: !!userId });
  const activities = useQuery({ queryKey: ['activities', userId, 0],
    queryFn: () => listActivities(userId, 0, 30), enabled: !!userId });
  const feed = useQuery({ queryKey: ['friend-feed-home', userId], enabled: !!userId,
    queryFn: () => listFriendFeed(userId, 0, 3) });
  const notices = useQuery({ queryKey: ['notifications', userId],
    queryFn: () => listNotifications(userId), enabled: !!userId, refetchInterval: 30_000 });
  const runs = activities.data ?? [];
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekly = runs.filter((activity) => new Date(activity.startedAt) >= weekStart)
    .reduce((sum, activity) => sum + activity.distanceMeters, 0);
  return <Page>
    <Eyebrow>RUN / PROGRESS / REPEAT</Eyebrow>
    <Title>Salut {profile.data?.display_name ?? 'Runner'} 👋</Title>
    <Panel style={{ backgroundColor: palette.accent, paddingVertical: 28 }}>
      <Text style={{ color: palette.accentText, fontWeight: '800', letterSpacing: 2 }}>CETTE SEMAINE</Text>
      <Text style={{ color: palette.accentText, fontWeight: '900', fontSize: 52, letterSpacing: -2 }}>{formatKm(weekly)} <Text style={{ fontSize: 19 }}>KM</Text></Text>
      <Text style={{ color: palette.accentText }}>Chaque kilomètre compte.</Text>
    </Panel>
    <Button label="DÉMARRER UNE COURSE" onPress={() => router.push('/(tabs)/run')} />
    <Button label={`NOTIFICATIONS${notices.data?.filter((item) => !item.read_at).length
      ? ` · ${notices.data.filter((item) => !item.read_at).length} NOUVELLES` : ''}`}
      tone="muted" onPress={() => router.push('/social/notifications')} />
    <View style={{ gap: 13 }}>
      <Eyebrow>TES ACTIVITÉS RÉCENTES</Eyebrow>
      {activities.isPending ? <ActivityIndicator color={palette.accent} /> : activities.isError
        ? <Empty title="Chargement impossible" body="Vérifie ta connexion et réessaie."
            action={<Button label="RÉESSAYER" onPress={() => activities.refetch()} />} />
        : runs.length ? runs.slice(0, 3).map((activity) => <ActivityTile key={activity.id} activity={activity} />)
          : <Empty title="Ta première course t’attend" body="Commence une sortie pour voir ta progression ici."
              action={<Button label="COURIR" onPress={() => router.push('/(tabs)/run')} />} />}
    </View>
    <View style={{ gap: 13 }}><Eyebrow>COURSES DE TES AMIS</Eyebrow>
      {feed.isPending ? <ActivityIndicator color={palette.accent} /> : feed.isError
        ? <Empty title="Fil indisponible" body="Vérifie ta connexion et réessaie."
            action={<Button label="RÉESSAYER" onPress={() => feed.refetch()} />} />
        : feed.data?.length ? feed.data.map((item) =>
          <FriendActivityTile key={item.activity.activity_id} item={item} />)
          : <Empty title="Aucune course partagée" body="Les sorties rendues visibles par tes amis apparaîtront ici." />}
      <Button label="VOIR TOUTES LES COURSES" tone="muted" onPress={() => router.push('/social/feed')} />
    </View>
  </Page>;
}
