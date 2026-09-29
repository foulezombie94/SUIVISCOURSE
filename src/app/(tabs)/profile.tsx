import { useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { ActivityTile } from '@/components/activity-tile';
import { Button, Eyebrow, Field, Page, Panel, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { listActivities } from '@/services/activities';
import { getMyProfile } from '@/services/friends';
import { getRunScore, listBadges, listGoals } from '@/services/progression';
import { supabase } from '@/services/supabase';
import { useRunStore } from '@/store/run-store';
import { formatDuration, formatKm } from '@/utils/format';

const labels: Record<string,string> = {
  fastest_1k: '1 KM LE PLUS RAPIDE', fastest_5k: '5 KM LE PLUS RAPIDE',
  fastest_10k: '10 KM LE PLUS RAPIDE', longest_run: 'PLUS LONGUE COURSE',
};
export default function Profile() {
  const { session } = useAuth();
  const id = session?.user.id ?? '';
  const active = useRunStore((state) => state.active);
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const profile = useQuery({ queryKey: ['profile', id], queryFn: () => getMyProfile(id), enabled: !!id });
  const totals = useQuery({ queryKey: ['totals', id], queryFn: async () => {
    const { data, error } = await supabase.rpc('my_running_totals');
    if (error) throw error;
    return data?.[0];
  }, enabled: !!id });
  const records = useQuery({ queryKey: ['records', id], queryFn: async () => {
    const { data, error } = await supabase.from('personal_records')
      .select('record_type,value,achieved_at').eq('user_id', id);
    if (error) throw error;
    return data ?? [];
  }, enabled: !!id });
  const history = useInfiniteQuery({
    queryKey: ['history', id], enabled: !!id, initialPageParam: 0,
    queryFn: ({ pageParam }) => listActivities(id, pageParam, 20),
    getNextPageParam: (last, all) => last.length >= 20 ? all.length : undefined,
  });
  const runs = history.data?.pages.flat() ?? [];
  const badges = useQuery({ queryKey: ['badges', id], queryFn: () => listBadges(id),
    enabled: !!id });
  const goals = useQuery({ queryKey: ['goals', id], queryFn: () => listGoals(id),
    enabled: !!id });
  const latestScore = useQuery({ queryKey: ['score', runs[0]?.id],
    queryFn: () => getRunScore(runs[0].id), enabled: !!runs[0] });
  async function saveProfile() {
    const value = name.trim();
    if (!value) { setMessage('Le nom ne peut pas être vide.'); return; }
    const { error } = await supabase.from('profiles')
      .update({ display_name: value, bio: bio.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { setMessage('Profil non enregistré. Réessaie.'); return; }
    setEditing(false); setMessage('Profil enregistré.');
    void cache.invalidateQueries({ queryKey: ['profile', id] });
  }
  return <Page><Eyebrow>TA PROGRESSION</Eyebrow>
    <Title>{profile.data?.display_name ?? 'Profil'}</Title>
    <Text style={{ color: palette.accent, fontSize: 17 }}>@{profile.data?.username ?? '…'}</Text>
    <Panel>
      {editing ? <>
        <Field accessibilityLabel="Nom" placeholder="Nom affiché" value={name} onChangeText={setName} />
        <Field accessibilityLabel="Bio" placeholder="Bio courte" value={bio} onChangeText={setBio} maxLength={180} />
        <Button label="ENREGISTRER" onPress={saveProfile} />
        <Button label="ANNULER" tone="muted" onPress={() => setEditing(false)} />
      </> : <>
        <Text style={{ color: palette.text }}>{profile.data?.bio || 'Ajoute une courte bio pour tes amis.'}</Text>
        <Button label="MODIFIER LE PROFIL" tone="muted" onPress={() => {
          setName(profile.data?.display_name ?? '');
          setBio(profile.data?.bio ?? ''); setEditing(true); setMessage('');
        }} />
      </>}
      {message ? <Text style={{ color: palette.orange }}>{message}</Text> : null}
    </Panel>
    <Eyebrow>EN CHIFFRES</Eyebrow>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Panel style={{ flex: 1 }}><Text style={{ color: palette.muted }}>DISTANCE</Text>
        <Text style={{ color: palette.accent, fontSize: 26, fontWeight: '900' }}>{formatKm(totals.data?.total_distance_meters ?? 0)} KM</Text></Panel>
      <Panel style={{ flex: 1 }}><Text style={{ color: palette.muted }}>SORTIES</Text>
        <Text style={{ color: palette.accent, fontSize: 26, fontWeight: '900' }}>{totals.data?.run_count ?? 0}</Text></Panel>
    </View>
    <Panel><Text style={{ color: palette.muted }}>TEMPS TOTAL</Text>
      <Text style={{ color: palette.text, fontSize: 25, fontWeight: '900' }}>{formatDuration(totals.data?.total_elapsed_seconds ?? 0)}</Text></Panel>
    <Eyebrow>PROGRESSION</Eyebrow>
    <Panel><Text style={{ color: palette.muted }}>DERNIER RUN SCORE</Text>
      <Text style={{ color: palette.accent, fontSize: 44, fontWeight: '900' }}>{latestScore.data?.score ?? '—'}</Text>
      <Text style={{ color: palette.muted }}>Calculé par rapport à tes sorties précédentes.</Text></Panel>
    <Eyebrow>OBJECTIFS</Eyebrow>
    {(goals.data ?? []).map((goal) => <Panel key={goal.goal_id}>
      <Text style={{ color: palette.text, fontWeight: '800' }}>
        {goal.kind === 'distance' ? 'DISTANCE' : goal.kind === 'runs' ? 'COURSES'
          : goal.kind === 'best_5k' ? '5 KM CHRONO' : '10 KM CHRONO'} · {goal.period === 'week' ? 'SEMAINE'
          : goal.period === 'month' ? 'MOIS' : 'RECORD PERSONNEL'}
      </Text>
      <Text style={{ color: palette.accent, fontSize: 22, fontWeight: '900' }}>
        {goal.kind === 'distance' ? `${formatKm(goal.progress)} / ${formatKm(goal.target_value)} KM`
          : goal.kind === 'runs' ? `${goal.progress} / ${goal.target_value} SORTIES`
          : `${goal.progress ? formatDuration(goal.progress) : '—'} / ${formatDuration(goal.target_value)}`}</Text>
    </Panel>)}
    <Button label="GÉRER MES OBJECTIFS" tone="muted" onPress={() => router.push('/goals')} />
    <Eyebrow>BADGES</Eyebrow>
    {badges.isError ? <Text style={{ color: palette.error }}>Badges indisponibles. Réessaie plus tard.</Text> : null}
    {badges.data?.length ? <Panel>{badges.data.map((badge) => <View key={badge.code}>
      <Text style={{ color: palette.accent, fontWeight: '900' }}>✦ {badge.achievements?.title ?? badge.code}</Text>
      <Text style={{ color: palette.muted }}>{badge.achievements?.description}</Text>
    </View>)}</Panel> : !badges.isError ? <Text style={{ color: palette.muted }}>Ton premier badge arrive avec ta première course.</Text> : null}
    <Eyebrow>RECORDS PERSONNELS</Eyebrow>
    {records.data?.length ? <Panel>{records.data.map((record) => <View key={record.record_type}
      style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: palette.muted, flex: 1 }}>{labels[record.record_type] ?? record.record_type}</Text>
      <Text style={{ color: palette.text, fontWeight: '800' }}>{record.record_type === 'longest_run'
        ? `${formatKm(record.value)} KM` : formatDuration(record.value)}</Text>
    </View>)}</Panel> : <Text style={{ color: palette.muted }}>Tes records apparaîtront après tes premières courses.</Text>}
    <Eyebrow>HISTORIQUE</Eyebrow>
    {runs.map((activity) => <ActivityTile key={activity.id} activity={activity} />)}
    {history.hasNextPage ? <Button label="VOIR PLUS" tone="muted" disabled={history.isFetchingNextPage}
      onPress={() => history.fetchNextPage()} /> : null}
    {!runs.length ? <Text style={{ color: palette.muted }}>Aucune activité pour le moment.</Text> : null}
    <Button label="SE DÉCONNECTER" tone="muted" onPress={() => {
      if (active) { Alert.alert('Course en cours', 'Termine la course avant de te déconnecter.'); return; }
      void supabase.auth.signOut().then(() => router.replace('/(auth)/login'));
    }} />
  </Page>;
}
