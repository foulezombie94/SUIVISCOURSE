import { useState, type ReactNode } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, View } from 'react-native';
import { Text } from '@/components/typography';
import { ActivityTile } from '@/components/activity-tile';
import { Button, Field, Page, Panel } from '@/components/ui';
import { fonts } from '@/constants/typography';
import { useAuth } from '@/features/auth/auth-provider';
import { listActivities } from '@/services/activities';
import { getMyProfile } from '@/services/friends';
import { getRunScore, listBadges, listGoals } from '@/services/progression';
import { supabase } from '@/services/supabase';
import { useRunStore } from '@/store/run-store';
import { formatDuration, formatKm } from '@/utils/format';

const ink = '#000000';
const paper = '#FFFFFF';
function ProfileEyebrow({ children }: { children: ReactNode }) {
  return <Text style={{ color: ink, fontSize: 12, fontWeight: '900', letterSpacing: 2.2 }}>{children}</Text>;
}
function ProfileTitle({ children }: { children: ReactNode }) {
  return <Text style={{ color: ink, fontSize: 33, fontWeight: '900', letterSpacing: -1.2 }}>{children}</Text>;
}
function ProfilePanel({ children, style }: { children: ReactNode; style?: object }) {
  return <Panel style={[{ backgroundColor: paper, borderColor: ink }, style]}>{children}</Panel>;
}

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
  return <Page backgroundColor={paper}><StatusBar style="dark" /><ProfileEyebrow>TA PROGRESSION</ProfileEyebrow>
    <ProfileTitle>{profile.data?.display_name ?? 'Profil'}</ProfileTitle>
    <Text style={{ color: ink, fontSize: 17 }}>@{profile.data?.username ?? '…'}</Text>
    <ProfilePanel>
      {editing ? <>
        <Field placeholderTextColor={ink} style={{ backgroundColor: paper, color: ink, borderColor: ink }} accessibilityLabel="Nom" placeholder="Nom affiché" value={name} onChangeText={setName} />
        <Field placeholderTextColor={ink} style={{ backgroundColor: paper, color: ink, borderColor: ink }} accessibilityLabel="Bio" placeholder="Bio courte" value={bio} onChangeText={setBio} maxLength={180} />
        <Button inverted label="ENREGISTRER" onPress={saveProfile} />
        <Button inverted label="ANNULER" tone="muted" onPress={() => setEditing(false)} />
      </> : <>
        <Text style={{ color: ink }}>{profile.data?.bio || 'Ajoute une courte bio pour tes amis.'}</Text>
        <Button inverted label="MODIFIER LE PROFIL" tone="muted" onPress={() => {
          setName(profile.data?.display_name ?? '');
          setBio(profile.data?.bio ?? ''); setEditing(true); setMessage('');
        }} />
      </>}
      {message ? <Text style={{ color: ink }}>{message}</Text> : null}
    </ProfilePanel>
    <ProfileEyebrow>EN CHIFFRES</ProfileEyebrow>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <ProfilePanel style={{ flex: 1 }}><Text style={{ color: ink }}>DISTANCE</Text>
        <Text style={{ color: ink, fontSize: 26, fontFamily: fonts.monoBold }}>{formatKm(totals.data?.total_distance_meters ?? 0)} KM</Text></ProfilePanel>
      <ProfilePanel style={{ flex: 1 }}><Text style={{ color: ink }}>SORTIES</Text>
        <Text style={{ color: ink, fontSize: 26, fontFamily: fonts.monoBold }}>{totals.data?.run_count ?? 0}</Text></ProfilePanel>
    </View>
    <ProfilePanel><Text style={{ color: ink }}>TEMPS TOTAL</Text>
      <Text style={{ color: ink, fontSize: 25, fontFamily: fonts.monoBold }}>{formatDuration(totals.data?.total_elapsed_seconds ?? 0)}</Text></ProfilePanel>
    <ProfileEyebrow>PROGRESSION</ProfileEyebrow>
    <ProfilePanel><Text style={{ color: ink }}>DERNIER RUN SCORE</Text>
      <Text style={{ color: ink, fontSize: 44, fontFamily: fonts.monoBold }}>{latestScore.data?.score ?? '—'}</Text>
      <Text style={{ color: ink }}>Calculé par rapport à tes sorties précédentes.</Text></ProfilePanel>
    <ProfileEyebrow>OBJECTIFS</ProfileEyebrow>
    {(goals.data ?? []).map((goal) => <ProfilePanel key={goal.goal_id}>
      <Text style={{ color: ink, fontWeight: '800' }}>
        {goal.kind === 'distance' ? 'DISTANCE' : goal.kind === 'runs' ? 'COURSES'
          : goal.kind === 'best_5k' ? '5 KM CHRONO' : '10 KM CHRONO'} · {goal.period === 'week' ? 'SEMAINE'
          : goal.period === 'month' ? 'MOIS' : 'RECORD PERSONNEL'}
      </Text>
      <Text style={{ color: ink, fontSize: 22, fontWeight: '900' }}>
        {goal.kind === 'distance' ? `${formatKm(goal.progress)} / ${formatKm(goal.target_value)} KM`
          : goal.kind === 'runs' ? `${goal.progress} / ${goal.target_value} SORTIES`
          : `${goal.progress ? formatDuration(goal.progress) : '—'} / ${formatDuration(goal.target_value)}`}</Text>
    </ProfilePanel>)}
    <Button inverted label="GÉRER MES OBJECTIFS" tone="muted" onPress={() => router.push('/goals')} />
    <ProfileEyebrow>BADGES</ProfileEyebrow>
    {badges.isError ? <Text style={{ color: ink }}>Badges indisponibles. Réessaie plus tard.</Text> : null}
    {badges.data?.length ? <ProfilePanel>{badges.data.map((badge) => <View key={badge.code}>
      <Text style={{ color: ink, fontWeight: '900' }}>✦ {badge.achievements?.title ?? badge.code}</Text>
      <Text style={{ color: ink }}>{badge.achievements?.description}</Text>
    </View>)}</ProfilePanel> : !badges.isError ? <Text style={{ color: ink }}>Ton premier badge arrive avec ta première course.</Text> : null}
    <ProfileEyebrow>RECORDS PERSONNELS</ProfileEyebrow>
    {records.data?.length ? <ProfilePanel>{records.data.map((record) => <View key={record.record_type}
      style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: ink, flex: 1 }}>{labels[record.record_type] ?? record.record_type}</Text>
      <Text style={{ color: ink, fontWeight: '800' }}>{record.record_type === 'longest_run'
        ? `${formatKm(record.value)} KM` : formatDuration(record.value)}</Text>
    </View>)}</ProfilePanel> : <Text style={{ color: ink }}>Tes records apparaîtront après tes premières courses.</Text>}
    <ProfileEyebrow>HISTORIQUE</ProfileEyebrow>
    {runs.map((activity) => <ActivityTile key={activity.id} activity={activity} inverted />)}
    {history.hasNextPage ? <Button inverted label="VOIR PLUS" tone="muted" disabled={history.isFetchingNextPage}
      onPress={() => history.fetchNextPage()} /> : null}
    {!runs.length ? <Text style={{ color: ink }}>Aucune activité pour le moment.</Text> : null}
    <Button inverted label="SE DÉCONNECTER" tone="muted" onPress={() => {
      if (active) { Alert.alert('Course en cours', 'Termine la course avant de te déconnecter.'); return; }
      void supabase.auth.signOut().then(() => router.replace('/(auth)/login'));
    }} />
  </Page>;
}
