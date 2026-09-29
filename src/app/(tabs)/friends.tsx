import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Alert, Pressable, Share, View } from 'react-native';
import { Text } from '@/components/typography';
import { Button, Empty, Eyebrow, Field, Page, Panel, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { answerRequest, findByCode, getMyProfile, listFriends, listRequests,
  profilesByIds, removeFriend, sendFriendRequest } from '@/services/friends';

export default function Friends() {
  const { session } = useAuth();
  const id = session?.user.id ?? '';
  const cache = useQueryClient();
  const [code, setCode] = useState('');
  const [candidate, setCandidate] = useState<Awaited<ReturnType<typeof findByCode>>>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const profile = useQuery({ queryKey: ['profile', id], queryFn: () => getMyProfile(id), enabled: !!id });
  const friends = useQuery({ queryKey: ['friends', id], queryFn: () => listFriends(id), enabled: !!id });
  const requests = useQuery({ queryKey: ['requests', id], queryFn: () => listRequests(id), enabled: !!id });
  const incoming = (requests.data ?? []).filter((item) => item.receiver_id === id);
  const senders = useQuery({ queryKey: ['request-senders', incoming.map((x) => x.sender_id).join(',')],
    queryFn: () => profilesByIds(incoming.map((x) => x.sender_id)), enabled: incoming.length > 0 });
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['friends', id] });
    void cache.invalidateQueries({ queryKey: ['requests', id] });
    void cache.invalidateQueries({ queryKey: ['request-senders'] });
  };
  async function lookup() {
    setBusy(true); setCandidate(null); setMessage('');
    try {
      const found = await findByCode(code);
      if (!found) setMessage('Code introuvable. Vérifie les caractères.');
      else if (found.id === id) setMessage('C’est ton propre code.');
      else setCandidate(found);
    } catch { setMessage('Recherche impossible. Vérifie ta connexion.'); }
    finally { setBusy(false); }
  }
  async function send() {
    if (!candidate) return;
    setBusy(true); setMessage('');
    try {
      await sendFriendRequest(id, candidate.id);
      setMessage('Demande envoyée.');
      setCandidate(null); setCode(''); refresh();
    } catch { setMessage('Demande déjà envoyée ou personne déjà ajoutée.'); }
    finally { setBusy(false); }
  }
  async function respond(requestId: string, accept: boolean) {
    setBusy(true); setMessage('');
    try { await answerRequest(requestId, accept); refresh(); }
    catch { setMessage('Impossible de traiter cette demande. Réessaie.'); }
    finally { setBusy(false); }
  }
  return <Page><Eyebrow>TES VRAIS AMIS</Eyebrow><Title>Courir ensemble.</Title>
    <View style={{ gap: 9 }}>
      <Button label="BATTLES" onPress={() => router.push('/social/battles')} />
      <Button label="CHALLENGES" tone="muted" onPress={() => router.push('/social/challenges')} />
      <Button label="CLASSEMENT AMIS" tone="muted" onPress={() => router.push('/social/leaderboard')} />
      <Button label="NOTIFICATIONS" tone="muted" onPress={() => router.push('/social/notifications')} />
    </View>
    <Panel style={{ backgroundColor: palette.accent }}>
      <Text style={{ color: palette.accentText, fontWeight: '800', letterSpacing: 2 }}>TON CODE AMI</Text>
      <Text selectable style={{ color: palette.accentText, fontSize: 26, fontWeight: '900' }}>{profile.data?.friend_code ?? '…'}</Text>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <Pressable onPress={async () => {
          if (profile.data?.friend_code) { await Clipboard.setStringAsync(profile.data.friend_code); setMessage('Code copié.'); }
        }} style={{ padding: 12, borderRadius: 11, backgroundColor: palette.accentText }}>
          <Text style={{ color: palette.accent, fontWeight: '800' }}>COPIER</Text>
        </Pressable>
        <Pressable onPress={() => profile.data?.friend_code && Share.share({
          message: `Ajoute-moi sur Élan avec mon code ami : ${profile.data.friend_code}`,
        })} style={{ padding: 12, borderRadius: 11, backgroundColor: palette.accentText }}>
          <Text style={{ color: palette.accent, fontWeight: '800' }}>PARTAGER</Text>
        </Pressable>
      </View>
    </Panel>
    <Panel><Eyebrow>AJOUTER UN AMI</Eyebrow>
      <Field accessibilityLabel="Code ami" placeholder="RUN-XXXXXXXXXXXX" autoCapitalize="characters"
        value={code} onChangeText={setCode} />
      <Button label="RECHERCHER" disabled={busy || !code.trim()} onPress={lookup} />
      {candidate ? <View style={{ gap: 9 }}>
        <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{candidate.display_name} · @{candidate.username}</Text>
        <Button label="ENVOYER UNE DEMANDE" disabled={busy} onPress={send} />
      </View> : null}
    </Panel>
    {message ? <Text style={{ color: palette.orange }}>{message}</Text> : null}
    <Eyebrow>DEMANDES REÇUES · {incoming.length}</Eyebrow>
    {incoming.length ? incoming.map((request) => {
      const sender = senders.data?.find((item) => item.id === request.sender_id);
      return <Panel key={request.id}><Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>
        {sender ? `${sender.display_name} · @${sender.username}` : 'Coureur'}
      </Text><View style={{ flexDirection: 'row', gap: 9 }}>
        <View style={{ flex: 1 }}><Button label="ACCEPTER" disabled={busy} onPress={() => respond(request.id, true)} /></View>
        <View style={{ flex: 1 }}><Button label="REFUSER" tone="muted" disabled={busy} onPress={() => respond(request.id, false)} /></View>
      </View></Panel>;
    }) : <Text style={{ color: palette.muted }}>Aucune demande en attente.</Text>}
    <Eyebrow>AMIS · {friends.data?.length ?? 0}</Eyebrow>
    {friends.data?.length ? friends.data.map((friend) => <Panel key={friend.id}>
      <Pressable onPress={() => router.push({ pathname: '/friend/[id]', params: { id: friend.id } })}>
        <Text style={{ color: palette.text, fontSize: 19, fontWeight: '900' }}>{friend.display_name}</Text>
        <Text style={{ color: palette.muted }}>@{friend.username}</Text>
      </Pressable>
      <Text onPress={() => Alert.alert('Retirer cet ami ?', friend.display_name,
        [{ text: 'Annuler', style: 'cancel' }, { text: 'Retirer', style: 'destructive', onPress: async () => {
          try { await removeFriend(id, friend.id); refresh(); }
          catch { setMessage('Impossible de retirer cet ami.'); }
        } }])} style={{ color: palette.error, paddingTop: 6 }}>Retirer de mes amis</Text>
    </Panel>) : friends.isPending ? <Text style={{ color: palette.muted }}>Chargement…</Text>
      : <Empty title="Aucun ami pour le moment" body="Partage ton code ou saisis celui d’un ami." />}
  </Page>;
}
