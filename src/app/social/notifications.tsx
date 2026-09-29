import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Eyebrow, Page, Panel, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { profilesByIds } from '@/services/friends';
import { answerRunTogether, listMyRunTogetherInvites,
  listNotifications, markNotificationRead } from '@/services/notifications';

export default function NotificationsScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const cache = useQueryClient();
  const [message, setMessage] = useState('');
  const notices = useQuery({ queryKey: ['notifications', userId],
    queryFn: () => listNotifications(userId), enabled: !!userId, refetchInterval: 30_000 });
  const invites = useQuery({ queryKey: ['together-invites', userId],
    queryFn: () => listMyRunTogetherInvites(userId), enabled: !!userId, refetchInterval: 30_000 });
  const actorIds = [...new Set((notices.data ?? []).map((item) => item.actor_id).filter((id): id is string => !!id))];
  const actors = useQuery({ queryKey: ['notification-actors', actorIds.join(',')],
    queryFn: () => profilesByIds(actorIds), enabled: actorIds.length > 0 });
  async function openNotice(notice: NonNullable<typeof notices.data>[number]) {
    try {
      if (!notice.read_at) {
        await markNotificationRead(notice.id);
        await cache.invalidateQueries({ queryKey: ['notifications', userId] });
      }
      if (notice.kind === 'battle_invite') router.push('/social/battles');
      else if (notice.kind === 'challenge_invite' || notice.kind === 'challenge_complete')
        router.push('/social/challenges');
      else if (notice.kind === 'friend_accepted') router.push('/(tabs)/friends');
      else if (notice.kind === 'goal_complete') router.push('/goals');
      else if (notice.kind === 'run_together_invite' && notice.entity_id)
        router.push({ pathname: '/activity/[id]', params: { id: notice.entity_id } });
    } catch { setMessage('Notification indisponible. Réessaie.'); }
  }
  async function respond(activityId: string, accept: boolean) {
    try {
      await answerRunTogether(activityId, userId, accept);
      await cache.invalidateQueries({ queryKey: ['together-invites', userId] });
      await cache.invalidateQueries({ queryKey: ['together', activityId] });
      setMessage(accept ? 'Course confirmée.' : 'Invitation refusée.');
    } catch { setMessage('Réponse impossible. Réessaie.'); }
  }
  return <Page><Eyebrow>JUSTE CE QUI COMPTE</Eyebrow><Title>Notifications.</Title>
    {message ? <Text style={{ color: palette.orange }}>{message}</Text> : null}
    <Eyebrow>RUN TOGETHER · À CONFIRMER</Eyebrow>
    {(invites.data ?? []).map((invite) => <Panel key={invite.activity_id}>
      <Text style={{ color: palette.text, fontWeight: '900' }}>Un ami a couru avec toi ?</Text>
      <Text style={{ color: palette.muted }}>Confirme uniquement si vous avez réellement fait cette sortie ensemble.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button label="CONFIRMER" onPress={() => respond(invite.activity_id, true)} /></View>
        <View style={{ flex: 1 }}><Button label="REFUSER" tone="muted" onPress={() => respond(invite.activity_id, false)} /></View>
      </View>
      <Button label="VOIR LA COURSE" tone="muted" onPress={() => router.push({ pathname: '/activity/[id]',
        params: { id: invite.activity_id } })} />
    </Panel>)}
    <Eyebrow>ACTUALITÉ</Eyebrow>
    {(notices.data ?? []).map((notice) => {
      const actor = actors.data?.find((profile) => profile.id === notice.actor_id);
      return <Panel key={notice.id} style={{ borderWidth: notice.read_at ? 0 : 1, borderColor: palette.accent }}>
        <Text style={{ color: palette.accent, fontWeight: '900' }}>{notice.title}</Text>
        <Text style={{ color: palette.text }}>{actor ? `${actor.display_name} · ` : ''}{notice.body}</Text>
        <Text style={{ color: palette.muted }}>{new Date(notice.created_at).toLocaleString('fr-FR')}</Text>
        <Button label={notice.read_at ? 'OUVRIR' : 'VOIR · NOUVEAU'} tone="muted" onPress={() => openNotice(notice)} />
      </Panel>;
    })}
    {!notices.data?.length && !invites.data?.length ? <Text style={{ color: palette.muted }}>Aucune notification pour le moment.</Text> : null}
    {notices.isError || invites.isError ? <Button label="RÉESSAYER" tone="muted" onPress={() => {
      void notices.refetch(); void invites.refetch();
    }} /> : null}
    <Text style={{ color: palette.muted }}>Les notifications restent dans l’app et se rafraîchissent quand elle est ouverte.</Text>
  </Page>;
}
