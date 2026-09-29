import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { Button, Eyebrow, Field, Page, Panel, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { deleteGoal, listGoals, saveGoal, type GoalKind } from '@/services/progression';
import { formatDuration } from '@/utils/format';

export default function GoalsScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const cache = useQueryClient();
  const [kind, setKind] = useState<GoalKind>('distance');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [target, setTarget] = useState('30');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const goals = useQuery({ queryKey: ['goals', userId], queryFn: () => listGoals(userId), enabled: !!userId });
  async function save() {
    const value = Number(target.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0 || (kind === 'runs' && !Number.isInteger(value))) {
      setMessage(kind === 'runs' ? 'Entre un nombre entier de courses.' : 'Entre une cible positive.'); return;
    }
    setBusy(true); setMessage('');
    try {
      await saveGoal(userId, kind, kind.startsWith('best_') ? 'all_time' : period,
        kind === 'distance' ? value * 1000 : kind === 'runs' ? Math.round(value) : Math.round(value * 60));
      await cache.invalidateQueries({ queryKey: ['goals', userId] });
      setMessage('Objectif enregistré.');
    } catch { setMessage('Enregistrement impossible. Réessaie.'); }
    finally { setBusy(false); }
  }
  return <Page><Eyebrow>AVANCER À TON RYTHME</Eyebrow><Title>Mes objectifs.</Title>
    <Panel><Eyebrow>NOUVEL OBJECTIF</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['distance','runs','best_5k','best_10k'] as const).map((item) =>
        <Pressable key={item} onPress={() => { setKind(item); setTarget(item === 'distance' ? '30'
          : item === 'runs' ? '3' : item === 'best_5k' ? '25' : '50'); }}
          style={{ padding: 12, borderRadius: 12, backgroundColor: kind === item ? palette.accent : palette.surfaceAlt }}>
          <Text style={{ color: kind === item ? palette.accentText : palette.text }}>
            {item === 'distance' ? 'KILOMÈTRES' : item === 'runs' ? 'COURSES'
              : item === 'best_5k' ? '5 KM CHRONO' : '10 KM CHRONO'}</Text>
        </Pressable>)}</View>
      {!kind.startsWith('best_') ? <View style={{ flexDirection: 'row', gap: 8 }}>{(['week','month'] as const).map((item) =>
        <Pressable key={item} onPress={() => setPeriod(item)}
          style={{ padding: 12, borderRadius: 12, backgroundColor: period === item ? palette.accent : palette.surfaceAlt }}>
          <Text style={{ color: period === item ? palette.accentText : palette.text }}>{item === 'week' ? 'SEMAINE' : 'MOIS'}</Text>
        </Pressable>)}</View> : null}
      <Field accessibilityLabel="Valeur cible" keyboardType="decimal-pad" value={target} onChangeText={setTarget}
        placeholder={kind === 'distance' ? 'Distance en km' : kind === 'runs' ? 'Nombre de courses' : 'Minutes à battre'} />
      <Button label="ENREGISTRER L’OBJECTIF" disabled={busy} onPress={save} />
    </Panel>
    {message ? <Text style={{ color: palette.orange }}>{message}</Text> : null}
    <Eyebrow>EN COURS</Eyebrow>
    {(goals.data ?? []).map((goal) => {
      const distance = goal.kind === 'distance';
      const chrono = goal.kind === 'best_5k' || goal.kind === 'best_10k';
      const progress = distance ? goal.progress / 1000 : goal.progress;
      const targetValue = distance ? goal.target_value / 1000 : goal.target_value;
      const ratio = chrono ? progress ? Math.min(1, goal.target_value / progress) : 0
        : Math.min(1, goal.progress / goal.target_value);
      return <Panel key={goal.goal_id}>
        <Text style={{ color: palette.text, fontSize: 17, fontWeight: '900' }}>
          {distance ? 'DISTANCE' : goal.kind === 'runs' ? 'COURSES'
            : goal.kind === 'best_5k' ? '5 KM CHRONO' : '10 KM CHRONO'} ·
          {goal.period === 'week' ? ' CETTE SEMAINE' : goal.period === 'month' ? ' CE MOIS' : ' RECORD PERSONNEL'}</Text>
        <Text style={{ color: palette.accent, fontSize: 25, fontWeight: '900' }}>
          {chrono ? `${progress ? formatDuration(progress) : '—'} / ${formatDuration(goal.target_value)}`
            : `${progress.toFixed(distance ? 1 : 0)} / ${targetValue} ${distance ? 'KM' : 'SORTIES'}`}
        </Text>
        <View style={{ height: 8, borderRadius: 5, backgroundColor: palette.surfaceAlt }}>
          <View style={{ height: 8, width: `${ratio * 100}%`, borderRadius: 5, backgroundColor: palette.accent }} />
        </View>
        {goal.period_end ? <Text style={{ color: palette.muted }}>Fin de période : {new Date(goal.period_end).toLocaleDateString('fr-FR')}</Text> : null}
        <Button label="SUPPRIMER" tone="muted" onPress={async () => {
          try { await deleteGoal(goal.goal_id); await cache.invalidateQueries({ queryKey: ['goals', userId] }); }
          catch { setMessage('Suppression impossible.'); }
        }} />
      </Panel>;
    })}
    {!goals.data?.length ? <Text style={{ color: palette.muted }}>Choisis un premier objectif à ton rythme.</Text> : null}
  </Page>;
}
