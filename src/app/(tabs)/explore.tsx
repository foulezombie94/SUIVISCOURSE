import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { ActivityTile } from '@/components/activity-tile';
import { Button, Empty, Eyebrow, Page, Panel, Title } from '@/components/ui';
import { RouteMap } from '@/components/route-map';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { getActivity, listActivities } from '@/services/activities';

export default function Explore() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const runs = useQuery({ queryKey: ['explore-runs', userId], queryFn: () => listActivities(userId, 0, 20), enabled: !!userId });
  const latest = runs.data?.[0];
  const detail = useQuery({ queryKey: ['explore-detail', userId, latest?.id],
    queryFn: () => getActivity(userId, latest!.id), enabled: !!latest });
  return <Page><Eyebrow>TES PARCOURS</Eyebrow><Title>Explorer.</Title>
    <Button label="DÉCOUVRIR LES CHALLENGES" onPress={() => router.push('/social/challenges')} />
    <Text style={{ color: palette.muted, lineHeight: 22 }}>Retrouve tes sorties et revisite tes tracés. La carte d’exploration à cellules arrivera dans la phase 3.</Text>
    {detail.data?.points.length ? <Panel><Eyebrow>DERNIER PARCOURS</Eyebrow>
      <RouteMap points={detail.data.points} height={260} /></Panel> : null}
    {runs.data?.length ? <View style={{ gap: 12 }}>
      {runs.data.map((activity) => <ActivityTile key={activity.id} activity={activity} />)}
    </View> : runs.isPending ? <Text style={{ color: palette.muted }}>Chargement…</Text>
      : <Empty title="Aucun parcours" body="La carte de ta première course apparaîtra ici." />}
  </Page>;
}
