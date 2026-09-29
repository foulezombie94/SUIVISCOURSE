import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/typography';
import { Button, Empty, Eyebrow, Page, Panel, Title } from '@/components/ui';
import { RouteMap } from '@/components/route-map';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { personalRecords } from '@/features/activities/records';
import { calculateRunScore } from '@/features/activities/run-score';
import { getActivity, setVisibility } from '@/services/activities';
import { getSharedActivity } from '@/services/feed';
import { listFriends } from '@/services/friends';
import { inviteRunTogether, listRunTogether } from '@/services/notifications';
import { getRunScore } from '@/services/progression';
import { listLocalActivities } from '@/services/local-activities';
import { formatDuration, formatKm, formatPace } from '@/utils/format';

export function ActivityDetail({ id, finished = false }: { id: string; finished?: boolean }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const query = useQuery({ queryKey: ['activity', userId, id],
    queryFn: () => getActivity(userId, id), enabled: !!userId && !!id });
  const records = useQuery({ queryKey: ['local-records', userId],
    queryFn: () => listLocalActivities(userId), enabled: !!userId });
  const activity = query.data;
  const isOwner = activity?.userId === userId;
  const score = useQuery({ queryKey: ['score', id], queryFn: () => getRunScore(id),
    enabled: !!id && !!isOwner });
  const shared = useQuery({ queryKey: ['shared', id], queryFn: () => getSharedActivity(id),
    enabled: !!id && !!activity && !isOwner });
  const friends = useQuery({ queryKey: ['friends', userId], queryFn: () => listFriends(userId),
    enabled: !!userId && !!isOwner });
  const together = useQuery({ queryKey: ['together', id], queryFn: () => listRunTogether(id),
    enabled: !!id && !!activity });
  if (query.isPending) return <Page><ActivityIndicator color={palette.accent} /></Page>;
  if (!activity) return <Page><Empty title="Course introuvable" body="Cette activité n’est pas disponible sur cet appareil." /></Page>;
  const achieved = [...personalRecords(records.data ?? []).entries()]
    .filter(([, value]) => value.activityId === activity.id);
  const displayScore = score.data?.score ?? shared.data?.run_score ??
    (isOwner && activity.syncState === 'pending' ? calculateRunScore(activity, records.data ?? []).score : null);
  return <Page><Eyebrow>{finished ? 'RUN COMPLETE ✦' : 'DÉTAIL DE LA COURSE'}</Eyebrow>
    <Title>{activity.title}</Title>
    <Panel style={{ backgroundColor: palette.accent, alignItems: 'center', paddingVertical: 30 }}>
      <Text style={{ color: palette.accentText, fontWeight: '900', fontSize: 56 }}>{formatKm(activity.distanceMeters)} KM</Text>
      <Text style={{ color: palette.accentText, fontWeight: '800', fontSize: 20 }}>{formatDuration(activity.elapsedSeconds)}  ·  {formatPace(activity.averagePaceSecPerKm)} /KM</Text>
    </Panel>
    {activity.syncState === 'pending' ? <Text style={{ color: palette.orange }}>Sauvegardée sur le téléphone. Synchronisation dès le retour du réseau.</Text> : null}
    {activity.verificationStatus === 'suspicious' ? <Text style={{ color: palette.orange }}>
      Cette activité contient des données GPS incohérentes. Elle reste enregistrée mais ne compte pas dans les classements.
    </Text> : null}
    {displayScore != null ? <Panel>
      <Eyebrow>RUN SCORE · PROGRESSION PERSONNELLE</Eyebrow>
      <Text style={{ color: palette.accent, fontWeight: '900', fontSize: 46 }}>{displayScore}</Text>
      <Text style={{ color: palette.muted }}>Un repère personnel, pas une mesure médicale.</Text>
    </Panel> : null}
    {activity.points.length ? <Panel><Eyebrow>TON PARCOURS</Eyebrow><RouteMap points={activity.points} /></Panel> : null}
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Panel style={{ flex: 1 }}><Text style={{ color: palette.muted }}>TEMPS EN MOUVEMENT</Text><Text style={{ color: palette.text, fontSize: 22, fontWeight: '900' }}>{formatDuration(activity.movingSeconds)}</Text></Panel>
      <Panel style={{ flex: 1 }}><Text style={{ color: palette.muted }}>DÉNIVELÉ +</Text><Text style={{ color: palette.text, fontSize: 22, fontWeight: '900' }}>{Math.round(activity.elevationGainMeters)} M</Text></Panel>
    </View>
    {activity.splits.length ? <Panel><Eyebrow>SPLITS</Eyebrow>
      {activity.splits.map((split) => <View key={split.kilometer}
        style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: palette.muted }}>KM {split.kilometer}</Text>
        <Text style={{ color: palette.text, fontWeight: '800' }}>{formatDuration(split.movingSeconds)}</Text>
      </View>)}
    </Panel> : null}
    {achieved.length ? <Panel><Eyebrow>NOUVEAUX RECORDS</Eyebrow>
      {achieved.map(([key]) => <Text key={key} style={{ color: palette.accent, fontWeight: '800' }}>⚡ {key.replaceAll('_',' ').toUpperCase()}</Text>)}
    </Panel> : null}
    {isOwner ? <Panel><Eyebrow>PARTAGE AVEC TES AMIS</Eyebrow>
      <Text style={{ color: palette.muted }}>Ton tracé GPS complet reste privé. Seul le résumé est visible par tes amis.</Text>
      <Button label={activity.visibility === 'friends' ? 'REPASSER EN PRIVÉ' : 'PARTAGER LE RÉSUMÉ'}
        tone={activity.visibility === 'friends' ? 'muted' : 'accent'}
        disabled={busy || activity.syncState === 'pending' || activity.verificationStatus === 'suspicious'} onPress={async () => {
          setBusy(true); setMessage('');
          try {
            await setVisibility(activity, activity.visibility === 'friends' ? 'private' : 'friends');
            await cache.invalidateQueries({ queryKey: ['activity', userId, id] });
            await cache.invalidateQueries({ queryKey: ['friend-feed'] });
          } catch { setMessage('Partage impossible. Vérifie ta connexion.'); }
          finally { setBusy(false); }
        }} />
    </Panel> : null}
    {isOwner && activity.visibility === 'friends' ? <Panel><Eyebrow>RUN TOGETHER</Eyebrow>
      <Text style={{ color: palette.muted }}>Invite uniquement les amis qui ont vraiment couru avec toi.</Text>
      {(friends.data ?? []).filter((friend) => !together.data?.some((row) => row.user_id === friend.id))
        .map((friend) => <Pressable key={friend.id} onPress={() => setSelected((values) => values.includes(friend.id)
          ? values.filter((value) => value !== friend.id) : [...values, friend.id])}
          style={{ padding: 12, borderRadius: 12, backgroundColor: selected.includes(friend.id) ? palette.accent : palette.surfaceAlt }}>
          <Text style={{ color: selected.includes(friend.id) ? palette.accentText : palette.text }}>
            {selected.includes(friend.id) ? '✓ ' : ''}{friend.display_name}</Text>
        </Pressable>)}
      {selected.length ? <Button label="ENVOYER LES INVITATIONS" disabled={busy} onPress={async () => {
        setBusy(true); setMessage('');
        try {
          await inviteRunTogether(id, userId, selected);
          setSelected([]); setMessage('Invitations envoyées.');
          await cache.invalidateQueries({ queryKey: ['together', id] });
        } catch { setMessage('Invitations impossibles. Réessaie.'); }
        finally { setBusy(false); }
      }} /> : null}
      {(together.data ?? []).map((row) => <Text key={row.user_id} style={{ color: palette.muted }}>
        {friends.data?.find((friend) => friend.id === row.user_id)?.display_name ?? 'Ami'} ·
        {row.status === 'accepted' ? ' confirmé' : row.status === 'declined' ? ' refusé' : ' en attente'}
      </Text>)}
    </Panel> : null}
    {!isOwner && together.data?.some((row) => row.status === 'accepted') ?
      <Text style={{ color: palette.accent, fontWeight: '900' }}>RUN TOGETHER ✓</Text> : null}
    {message ? <Text style={{ color: palette.orange }}>{message}</Text> : null}
    {isOwner ? <Button label="CRÉER UNE RUN CARD" onPress={() => router.push({ pathname: '/card/[id]', params: { id } })} /> : null}
    <Button label={finished ? 'RETOUR À L’ACCUEIL' : 'FERMER'} tone="muted"
      onPress={() => router.replace('/(tabs)')} />
  </Page>;
}
