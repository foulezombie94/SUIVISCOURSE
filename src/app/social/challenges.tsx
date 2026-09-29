import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/typography';
import { Button, Eyebrow, Field, Page, Panel, Title } from '@/components/ui';
import { FriendPicker, ProgressMeter } from '@/components/social';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { answerChallenge, challengeMembers, createChallenge, getChallengeProgress,
  joinOfficialChallenge, listChallenges, type Challenge } from '@/services/competitions';
import { listFriends } from '@/services/friends';
import { formatKm } from '@/utils/format';
import type { Profile } from '@/types/domain';

function ChallengePanel({ challenge, userId, friends, refresh, onError }: {
  challenge: Challenge; userId: string; friends: Profile[]; refresh: () => void; onError: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const members = useQuery({ queryKey: ['challenge-members', challenge.id],
    queryFn: () => challengeMembers(challenge.id) });
  const progress = useQuery({ queryKey: ['challenge-progress', challenge.id],
    queryFn: () => getChallengeProgress(challenge.id) });
  const me = members.data?.find((row) => row.user_id === userId);
  const mine = progress.data?.find((row) => row.user_id === userId)?.progress ?? 0;
  const isDistance = challenge.kind === 'distance';
  const current = new Date(now);
  const end = challenge.recurrence === 'monthly'
    ? new Date(current.getFullYear(), current.getMonth() + 1, 1) : new Date(challenge.ends_at ?? '');
  const expired = end.getTime() <= now;
  const displayValue = (value: number) => isDistance ? `${formatKm(value)} KM` : `${value} sorties`;
  const act = async (action: () => Promise<void>) => {
    try { await action(); refresh(); } catch { onError(); }
  };
  return <Panel><Eyebrow>{challenge.is_official ? 'CHALLENGE ÉLAN' : 'CHALLENGE ENTRE AMIS'}</Eyebrow>
    <Text style={{ color: palette.text, fontSize: 20, fontWeight: '900' }}>{challenge.title}</Text>
    <Text style={{ color: palette.muted }}>Fin : {end.toLocaleDateString('fr-FR')} · Récompense : badge Défi relevé</Text>
    {me?.status === 'invited' && !expired ? <View style={{ gap: 8 }}>
      <Text style={{ color: palette.orange }}>Un ami t’invite à participer.</Text>
      <Button label="ACCEPTER" onPress={() => act(() => answerChallenge(challenge.id, userId, true))} />
      <Button label="REFUSER" tone="muted" onPress={() => act(() => answerChallenge(challenge.id, userId, false))} />
    </View> : null}
    {!me && challenge.is_official ? <Button label="REJOINDRE" onPress={() =>
      act(() => joinOfficialChallenge(challenge.id, userId))} /> : null}
    {me?.status === 'accepted' ? <>
      <Text style={{ color: palette.accent, fontSize: 23, fontWeight: '900' }}>
        {displayValue(mine)} / {displayValue(challenge.target_value)}</Text>
      <ProgressMeter ratio={mine / challenge.target_value} />
      {mine >= challenge.target_value ? <Text style={{ color: palette.accent, fontWeight: '900' }}>DÉFI RÉUSSI ✦</Text> : null}
      {(progress.data ?? []).filter((row) => row.status === 'accepted' && row.user_id !== userId)
        .sort((a, b) => b.progress - a.progress).map((row) =>
          <Text key={row.user_id} style={{ color: palette.muted }}>
            {friends.find((friend) => friend.id === row.user_id)?.display_name ?? 'Ami'} · {displayValue(row.progress)}</Text>)}
    </> : null}
    {expired ? <Text style={{ color: palette.muted }}>Challenge terminé.</Text> : null}
    {progress.isError ? <Text style={{ color: palette.error }}>Progression indisponible.</Text> : null}
  </Panel>;
}

export default function ChallengesScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const cache = useQueryClient();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'distance' | 'runs'>('distance');
  const [target, setTarget] = useState('30');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const friends = useQuery({ queryKey: ['friends', userId], queryFn: () => listFriends(userId), enabled: !!userId });
  const challenges = useQuery({ queryKey: ['challenges', userId], queryFn: listChallenges, enabled: !!userId });
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['challenges', userId] });
    void cache.invalidateQueries({ queryKey: ['challenge-members'] });
    void cache.invalidateQueries({ queryKey: ['challenge-progress'] });
  };
  async function create() {
    const value = Number(target.replace(',', '.'));
    if (title.trim().length < 3 || !selected.length || !Number.isFinite(value) || value <= 0) {
      setMessage('Ajoute un titre, une cible positive et au moins un ami.'); return;
    }
    setBusy(true); setMessage('');
    try {
      await createChallenge(userId, title, kind, kind === 'distance' ? value * 1000 : Math.round(value), selected, 30);
      setTitle(''); setSelected([]); setMessage('Challenge créé. Invitations envoyées.'); refresh();
    } catch { setMessage('Création impossible. Vérifie les amis sélectionnés.'); }
    finally { setBusy(false); }
  }
  return <Page><Eyebrow>DES OBJECTIFS À PARTAGER</Eyebrow><Title>Challenges.</Title>
    <Eyebrow>OFFICIELS ET PRIVÉS</Eyebrow>
    {(challenges.data ?? []).map((challenge) => <ChallengePanel key={challenge.id} challenge={challenge}
      userId={userId} friends={friends.data ?? []} refresh={refresh}
      onError={() => setMessage('Action impossible. Réessaie.')} />)}
    {challenges.isPending ? <Text style={{ color: palette.muted }}>Chargement des challenges…</Text> : null}
    {challenges.isError ? <Button label="RÉESSAYER LE CHARGEMENT" tone="muted"
      onPress={() => challenges.refetch()} /> : null}
    <Panel><Eyebrow>CRÉER UN CHALLENGE PRIVÉ</Eyebrow>
      <Field accessibilityLabel="Titre du challenge" placeholder="Ex. 30 km ensemble" value={title} onChangeText={setTitle} />
      <View style={{ flexDirection: 'row', gap: 8 }}>{(['distance','runs'] as const).map((item) =>
        <Pressable key={item} onPress={() => { setKind(item); setTarget(item === 'distance' ? '30' : '3'); }}
          style={{ padding: 11, borderRadius: 12, backgroundColor: kind === item ? palette.accent : palette.surfaceAlt }}>
          <Text style={{ color: kind === item ? palette.accentText : palette.text }}>
            {item === 'distance' ? 'DISTANCE' : 'COURSES'}</Text></Pressable>)}</View>
      <Field accessibilityLabel="Cible" keyboardType="decimal-pad" placeholder={kind === 'distance' ? 'Km' : 'Sorties'}
        value={target} onChangeText={setTarget} />
      <FriendPicker friends={friends.data ?? []} selected={selected} onChange={setSelected} />
      <Button label="INVITER MES AMIS" disabled={busy || !selected.length} onPress={create} />
    </Panel>
    <Text style={{ color: palette.muted }}>Les classements entre amis utilisent les courses partagées.</Text>
    {message ? <Text style={{ color: palette.orange }}>{message}</Text> : null}
  </Page>;
}
