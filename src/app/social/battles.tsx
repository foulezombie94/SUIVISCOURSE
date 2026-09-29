import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/typography';
import { Button, Eyebrow, Field, Page, Panel, Title } from '@/components/ui';
import { FriendPicker, ProgressMeter } from '@/components/social';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { answerBattle, createBattle, getBattleMilestones, getBattleProgress, listBattles,
  type Battle, type BattleKind } from '@/services/competitions';
import { listFriends } from '@/services/friends';
import { formatDuration, formatKm } from '@/utils/format';
import type { Profile } from '@/types/domain';

const kinds: { value: BattleKind; label: string }[] = [
  { value: 'first_to_distance', label: 'OBJECTIF KM' },
  { value: 'most_distance', label: 'PLUS DE KM' },
  { value: 'most_runs', label: 'PLUS DE COURSES' },
  { value: 'best_5k', label: 'MEILLEUR 5 KM' },
  { value: 'best_10k', label: 'MEILLEUR 10 KM' },
];
function BattlePanel({ battle, userId, friends, refresh, onError }: {
  battle: Battle; userId: string; friends: Profile[]; refresh: () => void; onError: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const progress = useQuery({ queryKey: ['battle-progress', battle.id],
    queryFn: () => getBattleProgress(battle.id) });
  const milestones = useQuery({ queryKey: ['battle-milestones', battle.id],
    queryFn: () => getBattleMilestones(battle.id), enabled: battle.kind === 'first_to_distance' });
  const me = progress.data?.find((row) => row.user_id === userId);
  const expired = new Date(battle.ends_at).getTime() <= now;
  const label = kinds.find((item) => item.value === battle.kind)?.label ?? battle.kind;
  const metric = (row: NonNullable<typeof progress.data>[number]) => battle.kind === 'most_runs'
    ? row.run_count : battle.kind === 'best_5k' ? row.best_5k_seconds
      : battle.kind === 'best_10k' ? row.best_10k_seconds : row.distance_meters;
  const accepted = (progress.data ?? []).filter((row) => row.status === 'accepted');
  const ranked = [...accepted].sort((a, b) => battle.kind.startsWith('best_')
    ? (metric(a) ?? Infinity) - (metric(b) ?? Infinity)
    : (metric(b) ?? 0) - (metric(a) ?? 0));
  const topValue = ranked[0] ? metric(ranked[0]) : null;
  const secondValue = ranked[1] ? metric(ranked[1]) : null;
  const reached = milestones.data?.find((item) => accepted.some((row) => row.user_id === item.user_id));
  const tiedMilestone = reached && milestones.data?.some((item) => item.user_id !== reached.user_id &&
    item.reached_at === reached.reached_at && accepted.some((row) => row.user_id === item.user_id));
  const winner = battle.kind === 'first_to_distance'
    ? reached && !tiedMilestone ? reached.user_id : null
    : expired && topValue != null && topValue > 0 && topValue !== secondValue ? ranked[0].user_id : null;
  const respond = async (accept: boolean) => {
    try { await answerBattle(battle.id, userId, accept); refresh(); }
    catch { onError(); }
  };
  return <Panel><Eyebrow>{expired ? 'BATTLE TERMINÉ' : 'BATTLE EN COURS'}</Eyebrow>
    <Text style={{ color: palette.text, fontSize: 21, fontWeight: '900' }}>{label}
      {battle.kind === 'first_to_distance' ? ` · ${formatKm(battle.target_value ?? 0)} KM` : ''}</Text>
    <Text style={{ color: palette.muted }}>Jusqu’au {new Date(battle.ends_at).toLocaleDateString('fr-FR')} · seules les courses partagées comptent</Text>
    {me?.status === 'invited' && !expired ? <View style={{ gap: 8 }}>
      <Text style={{ color: palette.orange }}>Un ami t’invite à ce Battle.</Text>
      <Button label="ACCEPTER" onPress={() => respond(true)} />
      <Button label="REFUSER" tone="muted" onPress={() => respond(false)} />
    </View> : null}
    {ranked.map((row, index) => {
      const value = metric(row);
      const name = row.user_id === userId ? 'Toi'
        : friends.find((friend) => friend.id === row.user_id)?.display_name ?? 'Ami';
      const formatted = battle.kind === 'most_runs' ? `${value ?? 0} sorties`
        : battle.kind.startsWith('best_') ? value ? formatDuration(value) : '—'
          : `${formatKm(value ?? 0)} km`;
      return <View key={row.user_id} style={{ gap: 5 }}>
        <Text style={{ color: row.user_id === userId ? palette.accent : palette.text, fontWeight: '800' }}>
          {index + 1}. {name} · {formatted} {winner === row.user_id ? '🏆' : ''}</Text>
        {battle.kind === 'first_to_distance' ? <ProgressMeter ratio={(value ?? 0) / (battle.target_value ?? 1)} /> : null}
      </View>;
    })}
    {progress.isError ? <Text style={{ color: palette.error }}>Progression indisponible. Réessaie plus tard.</Text> : null}
  </Panel>;
}

export default function BattlesScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [kind, setKind] = useState<BattleKind>('most_distance');
  const [target, setTarget] = useState('30');
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const friends = useQuery({ queryKey: ['friends', userId], queryFn: () => listFriends(userId), enabled: !!userId });
  const battles = useQuery({ queryKey: ['battles', userId], queryFn: () => listBattles(userId), enabled: !!userId });
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['battles', userId] });
    void cache.invalidateQueries({ queryKey: ['battle-progress'] });
    void cache.invalidateQueries({ queryKey: ['battle-milestones'] });
  };
  async function create() {
    const distance = Number(target.replace(',', '.'));
    if (!selected.length) { setMessage('Sélectionne au moins un ami.'); return; }
    if (kind === 'first_to_distance' && (!Number.isFinite(distance) || distance <= 0)) {
      setMessage('Entre une distance cible positive.'); return;
    }
    setBusy(true); setMessage('');
    try {
      await createBattle(userId, selected, kind, kind === 'first_to_distance' ? distance * 1000 : null, days);
      setSelected([]); setMessage('Battle créé. Tes amis ont reçu une invitation.'); refresh();
    } catch { setMessage('Création impossible. Vérifie que tous les participants sont tes amis.'); }
    finally { setBusy(false); }
  }
  return <Page><Eyebrow>COMPÉTITION ENTRE AMIS</Eyebrow><Title>Battles.</Title>
    <Panel><Eyebrow>LANCER UN BATTLE</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{kinds.map((item) =>
        <Pressable key={item.value} onPress={() => setKind(item.value)}
          style={{ padding: 11, borderRadius: 12, backgroundColor: kind === item.value ? palette.accent : palette.surfaceAlt }}>
          <Text style={{ color: kind === item.value ? palette.accentText : palette.text, fontWeight: '800' }}>{item.label}</Text>
        </Pressable>)}</View>
      {kind === 'first_to_distance' ? <Field accessibilityLabel="Distance cible en km" keyboardType="decimal-pad"
        value={target} onChangeText={setTarget} placeholder="30 km" /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>{[7,14,30].map((value) =>
        <Pressable key={value} onPress={() => setDays(value)} style={{ padding: 11, borderRadius: 12,
          backgroundColor: days === value ? palette.accent : palette.surfaceAlt }}>
          <Text style={{ color: days === value ? palette.accentText : palette.text }}>{value} JOURS</Text>
        </Pressable>)}</View>
      <FriendPicker friends={friends.data ?? []} selected={selected} onChange={setSelected} />
      <Button label="DÉFIER MES AMIS" disabled={busy || !selected.length} onPress={create} />
    </Panel>
    {message ? <Text style={{ color: palette.orange }}>{message}</Text> : null}
    <Eyebrow>TES BATTLES</Eyebrow>
    {battles.isPending ? <Text style={{ color: palette.muted }}>Chargement des Battles…</Text> : null}
    {battles.isError ? <Button label="RÉESSAYER LE CHARGEMENT" tone="muted"
      onPress={() => battles.refetch()} /> : null}
    {(battles.data ?? []).map((battle) => <BattlePanel key={battle.id} battle={battle} userId={userId}
      friends={friends.data ?? []} refresh={refresh} onError={() => setMessage('Action impossible. Réessaie.')} />)}
    {battles.isSuccess && !battles.data.length ? <Text style={{ color: palette.muted }}>Aucun Battle pour le moment.</Text> : null}
  </Page>;
}
