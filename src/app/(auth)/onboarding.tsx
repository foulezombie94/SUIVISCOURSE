import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/typography';
import { fonts } from '@/constants/typography';
import { useAuth } from '@/features/auth/auth-provider';
import { loadRunnerProfileDraft, saveRunnerProfileDraft,
  runnerProfileDraftKey, type RunnerProfileDraft, type RunningLevel } from '@/features/onboarding/runner-profile-draft';
import { MAX_HEIGHT_CM, MAX_WEIGHT_KG, MIN_HEIGHT_CM, MIN_WEIGHT_KG } from '@/features/onboarding/runner-profile-limits';
import { useRunnerProfile } from '@/features/onboarding/use-runner-profile';
import { saveRunnerProfile } from '@/services/runner-profile';

const questions = [
  { title: 'Quel âge as-tu ?', hint: 'Pour adapter tes statistiques de course.', unit: 'ans' },
  { title: 'Quel est ton poids ?', hint: 'Pour estimer les calories de tes sorties.', unit: 'kg' },
  { title: 'Quelle est ta taille ?', hint: 'Complète ton profil de coureur.', unit: 'cm' },
  { title: 'Tu cours à quel niveau ?', hint: 'On adapte ton expérience à ton rythme.' },
  { title: 'Combien de sorties par semaine ?', hint: 'Un repère pour suivre ta régularité.' },
] as const;
const levelOptions: { label: string; value: RunningLevel }[] = [
  { label: 'Je débute', value: 'beginner' },
  { label: 'De temps en temps', value: 'occasional' },
  { label: 'Régulièrement', value: 'regular' },
];
const frequencyOptions: { label: string; value: 1 | 3 | 5 }[] = [
  { label: '1 à 2 sorties', value: 1 },
  { label: '3 à 4 sorties', value: 3 },
  { label: '5 sorties ou plus', value: 5 },
];
type Form = { age: string; weight: string; height: string;
  level: RunningLevel | null; runs: 1 | 3 | 5 | null };
const empty: Form = { age: '19', weight: '70', height: '170', level: null, runs: null };
const numericKeys = ['age', 'weight', 'height'] as const;
const lime = '#B9F532';
const ageRowHeight = 72;
const weightTickWidth = 18;

function NumberWheel({ value, min, max, fallback, unit, onChange }: {
  value: number; min: number; max: number; fallback: number; unit: string;
  onChange: (value: number) => void;
}) {
  const list = useRef<ScrollView>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = Math.min(max, Math.max(min, value || fallback));
  const [initialOffset] = useState(() => ({ x: 0, y: (selected - min) * ageRowHeight }));
  const [visibleValue, setVisibleValue] = useState(selected);
  const visibleValueRef = useRef(selected);
  const valueAtOffset = (offset: number) => Math.min(max, Math.max(min,
    min + Math.round(offset / ageRowHeight)));
  const show = (number: number) => {
    if (visibleValueRef.current === number) return;
    visibleValueRef.current = number;
    setVisibleValue(number);
  };
  const settle = (offset: number) => onChange(valueAtOffset(offset));
  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);
  return <ScrollView ref={list} style={{ height: ageRowHeight * 5, flexGrow: 0 }}
    nestedScrollEnabled showsVerticalScrollIndicator={false} snapToInterval={ageRowHeight} decelerationRate="normal"
    scrollEventThrottle={16}
    contentOffset={initialOffset}
    contentContainerStyle={{ paddingVertical: ageRowHeight * 2, alignItems: 'center' }}
    onScroll={(event) => show(valueAtOffset(event.nativeEvent.contentOffset.y))}
    onMomentumScrollBegin={() => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    }}
    onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.y)}
    onScrollEndDrag={(event) => {
      const offset = event.nativeEvent.contentOffset.y;
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => settle(offset), 160);
    }}>
    {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((number) => <Pressable
      key={number} accessibilityRole="button" accessibilityLabel={`${number} ${unit}`}
      accessibilityState={{ selected: number === visibleValue }}
      onPress={() => { show(number); onChange(number); list.current?.scrollTo({ y: (number - min) * ageRowHeight, animated: true }); }}
      style={{ width: unit === 'cm' ? 180 : 146, height: ageRowHeight,
        alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: unit === 'cm' ? 158 : 116, height: number === visibleValue ? 100 : ageRowHeight,
        borderRadius: 29, backgroundColor: number === visibleValue ? lime : 'transparent',
        alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: number === visibleValue ? '#FFFFFF' : '#000000',
          opacity: number === visibleValue ? 1 : Math.abs(number - visibleValue) === 1 ? 0.65 : 0.28,
          fontFamily: fonts.monoBold,
          fontSize: number === visibleValue ? (unit === 'cm' ? 54 : 64) : Math.abs(number - visibleValue) === 1 ? 34 : 23,
          fontWeight: '900' }}>{number}</Text>
      </View>
    </Pressable>)}
  </ScrollView>;
}

function WeightRuler({ valueKg, onChange }: { valueKg: number; onChange: (value: number) => void }) {
  const { width } = useWindowDimensions();
  const rulerSidePadding = Math.round((width - weightTickWidth) / 2);
  const list = useRef<ScrollView>(null);
  const positionedUnit = useRef<string | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const min = unit === 'kg' ? MIN_WEIGHT_KG : Math.round(MIN_WEIGHT_KG * 2.20462);
  const max = unit === 'kg' ? MAX_WEIGHT_KG : Math.round(MAX_WEIGHT_KG * 2.20462);
  const selected = Math.min(max, Math.max(min, unit === 'kg'
    ? Math.round(valueKg || 70) : Math.round((valueKg || 70) * 2.20462)));
  const select = (raw: number) => {
    const next = Math.min(max, Math.max(min, raw));
    onChange(unit === 'kg' ? next : Math.min(MAX_WEIGHT_KG, Math.max(MIN_WEIGHT_KG,
      Number((next / 2.20462).toFixed(2)))));
  };
  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);
  return <View style={{ alignItems: 'center', gap: 12 }}>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['kg', 'lb'] as const).map((choice) => <Pressable key={choice} accessibilityRole="button"
        accessibilityState={{ selected: unit === choice }} onPress={() => {
          if (settleTimer.current) clearTimeout(settleTimer.current);
          setUnit(choice);
        }}
        style={{ width: 90, height: 38, borderRadius: 14, borderWidth: 1, borderColor: '#000000',
          backgroundColor: unit === choice ? '#000000' : '#FFFFFF',
          alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: unit === choice ? '#FFFFFF' : '#000000', fontWeight: '800' }}>{choice}</Text>
      </Pressable>)}
    </View>
    <Text style={{ color: '#000000', fontSize: 54, fontFamily: fonts.monoBold, fontWeight: '900' }}>
      {selected}<Text style={{ fontSize: 21, fontWeight: '700' }}>{unit}</Text>
    </Text>
    <View style={{ width, height: 82, justifyContent: 'center' }}>
      <ScrollView key={unit} ref={list} horizontal showsHorizontalScrollIndicator={false}
        snapToInterval={weightTickWidth} decelerationRate="fast"
        contentOffset={{ x: (selected - min) * weightTickWidth, y: 0 }}
        onContentSizeChange={() => {
          if (positionedUnit.current === unit || !list.current) return;
          positionedUnit.current = unit;
          list.current.scrollTo({ x: (selected - min) * weightTickWidth, animated: false });
        }}
        contentContainerStyle={{ paddingHorizontal: rulerSidePadding, alignItems: 'flex-end', paddingBottom: 12 }}
        onMomentumScrollBegin={() => {
          if (settleTimer.current) clearTimeout(settleTimer.current);
        }}
        onMomentumScrollEnd={(event) => select(min + Math.round(event.nativeEvent.contentOffset.x / weightTickWidth))}
        onScrollEndDrag={(event) => {
          const tick = min + Math.round(event.nativeEvent.contentOffset.x / weightTickWidth);
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = setTimeout(() => select(tick), 160);
        }}>
        {Array.from({ length: max - min + 1 }, (_, index) => {
          const number = min + index;
          return <View key={number} style={{ width: weightTickWidth, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ width: 2, height: number % 10 === 0 ? 37 : number % 5 === 0 ? 27 : 18,
              backgroundColor: '#000000' }} />
          </View>;
        })}
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', left: rulerSidePadding + weightTickWidth / 2 - 2, bottom: 10,
        width: 4, height: 58, borderRadius: 2, backgroundColor: '#000000' }} />
    </View>
  </View>;
}

function HeightRuler({ valueCm, onChange }: { valueCm: number; onChange: (value: number) => void }) {
  const { width } = useWindowDimensions();
  const rulerSidePadding = Math.round((width - weightTickWidth) / 2);
  const list = useRef<ScrollView>(null);
  const positionedUnit = useRef<string | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [unit, setUnit] = useState<'cm' | 'ft/in'>('cm');
  const imperial = unit === 'ft/in';
  const min = imperial ? Math.round(MIN_HEIGHT_CM / 2.54) : MIN_HEIGHT_CM;
  const max = imperial ? Math.round(MAX_HEIGHT_CM / 2.54) : MAX_HEIGHT_CM;
  const selected = Math.min(max, Math.max(min, imperial
    ? Math.round((valueCm || 170) / 2.54) : valueCm || 170));
  const display = imperial ? `${Math.floor(selected / 12)}′${selected % 12}″` : String(selected);
  const select = (raw: number) => {
    const next = Math.min(max, Math.max(min, raw));
    onChange(imperial ? Math.min(MAX_HEIGHT_CM, Math.max(MIN_HEIGHT_CM, Math.round(next * 2.54))) : next);
  };
  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);
  return <View style={{ alignItems: 'center', gap: 12 }}>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['cm', 'ft/in'] as const).map((choice) => <Pressable key={choice}
        accessibilityRole="button" accessibilityState={{ selected: unit === choice }}
        onPress={() => {
          if (settleTimer.current) clearTimeout(settleTimer.current);
          setUnit(choice);
        }}
        style={{ width: 90, height: 38, borderRadius: 14, borderWidth: 1,
          borderColor: '#000000', backgroundColor: unit === choice ? '#000000' : '#FFFFFF',
          alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: unit === choice ? '#FFFFFF' : '#000000', fontWeight: '800' }}>{choice}</Text>
      </Pressable>)}
    </View>
    <Text style={{ color: '#000000', fontSize: 54, fontFamily: fonts.monoBold,
      fontWeight: '900' }}>{display}{imperial ? null : <Text style={{ fontSize: 21 }}>cm</Text>}</Text>
    <View style={{ width, height: 82, justifyContent: 'center' }}>
      <ScrollView key={unit} ref={list} horizontal showsHorizontalScrollIndicator={false}
        snapToInterval={weightTickWidth} decelerationRate="fast"
        contentOffset={{ x: (selected - min) * weightTickWidth, y: 0 }}
        onContentSizeChange={() => {
          if (positionedUnit.current === unit || !list.current) return;
          positionedUnit.current = unit;
          list.current.scrollTo({ x: (selected - min) * weightTickWidth, animated: false });
        }}
        contentContainerStyle={{ paddingHorizontal: rulerSidePadding,
          alignItems: 'flex-end', paddingBottom: 12 }}
        onMomentumScrollBegin={() => {
          if (settleTimer.current) clearTimeout(settleTimer.current);
        }}
        onMomentumScrollEnd={(event) => select(min + Math.round(event.nativeEvent.contentOffset.x / weightTickWidth))}
        onScrollEndDrag={(event) => {
          const tick = min + Math.round(event.nativeEvent.contentOffset.x / weightTickWidth);
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = setTimeout(() => select(tick), 160);
        }}>
        {Array.from({ length: max - min + 1 }, (_, index) => {
          const number = min + index;
          const major = imperial ? number % 6 === 0 : number % 10 === 0;
          const medium = imperial ? number % 2 === 0 : number % 5 === 0;
          return <View key={number} style={{ width: weightTickWidth, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ width: 2, height: major ? 37 : medium ? 27 : 18,
              backgroundColor: '#000000' }} />
          </View>;
        })}
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', left: rulerSidePadding + weightTickWidth / 2 - 2,
        bottom: 10, width: 4, height: 58, borderRadius: 2, backgroundColor: '#000000' }} />
    </View>
  </View>;
}

export default function Onboarding() {
  const { finishOnboarding, session } = useAuth();
  const { afterSignup, email, confirmation } = useLocalSearchParams<{
    afterSignup?: string; email?: string; confirmation?: string;
  }>();
  const cache = useQueryClient();
  const runnerProfile = useRunnerProfile();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(empty);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (hydrated || (session && runnerProfile.isPending)) return;
    if (session && runnerProfile.isError) return;
    let alive = true;
    void loadRunnerProfileDraft().then((draft) => {
      const values = { ...runnerProfile.data, ...draft };
      if (alive) setForm({
        age: values.age == null ? '19' : String(values.age),
        weight: values.weightKg == null ? '70' : String(values.weightKg),
        height: values.heightCm == null ? '170' : String(values.heightCm),
        level: values.runningLevel ?? null,
        runs: values.runsPerWeek ?? null,
      });
      if (alive) setHydrated(true);
    });
    return () => { alive = false; };
  }, [session, runnerProfile.data, runnerProfile.isPending, runnerProfile.isError, hydrated]);
  async function advance(skip = false) {
    const next = { ...form };
    if (skip) {
      if (step < 3) next[numericKeys[step]] = '';
      else if (step === 3) next.level = null;
      else next.runs = null;
      setForm(next);
    } else if (step < 3) {
      const value = Number(next[numericKeys[step]].replace(',', '.'));
      const limits = [[10, 110], [MIN_WEIGHT_KG, MAX_WEIGHT_KG], [MIN_HEIGHT_CM, MAX_HEIGHT_CM]];
      if (!next[numericKeys[step]].trim() || !Number.isFinite(value)
        || value < limits[step][0] || value > limits[step][1]) {
        setError(step === 0 ? 'Entre un âge valide ou choisis Passer.' : 'Entre une valeur valide.'); return;
      }
    } else if (step === 3 ? !next.level : !next.runs) {
      setError('Choisis une réponse.'); return;
    }
    const draft: RunnerProfileDraft = {
      age: next.age ? Number(next.age) : undefined,
      weightKg: next.weight ? Number(next.weight.replace(',', '.')) : undefined,
      heightCm: next.height ? Number(next.height) : undefined,
      runningLevel: next.level ?? undefined,
      runsPerWeek: next.runs ?? undefined,
    };
    setBusy(true); setError('');
    try {
      await saveRunnerProfileDraft(draft);
      if (step === questions.length - 1) {
        if (session) {
          const saved = await saveRunnerProfile(session.user.id, draft);
          cache.setQueryData(['runner-profile', session.user.id], saved);
          await AsyncStorage.removeItem(runnerProfileDraftKey);
          router.replace(afterSignup === 'yes' ? '/(tabs)' : '/(tabs)/profile');
        } else {
          await finishOnboarding();
          if (afterSignup === 'yes') router.replace({ pathname: '/(auth)/course-setup',
            params: { email, confirmation, completed: 'yes' } });
          else router.replace('/(auth)/register');
        }
      } else setStep(step + 1);
    } catch { setError('Impossible d’enregistrer. Réessaie.'); }
    finally { setBusy(false); }
  }
  const current = questions[step];
  const wheelPage = step === 0;
  const pageBackground = '#FFFFFF';
  const foreground = '#000000';
  const buttonBackground = '#000000';
  const buttonForeground = '#FFFFFF';
  return <SafeAreaView key={step} style={{ flex: 1, backgroundColor: pageBackground }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={!wheelPage}
        style={{ backgroundColor: pageBackground }} contentContainerStyle={{
        flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>
        <View style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour"
            disabled={step === 0 && !session && afterSignup !== 'yes'} onPress={() => {
              if (step === 0 && afterSignup === 'yes') router.back();
              else if (step === 0) router.replace('/(tabs)/profile');
              else { setError(''); setStep(step - 1); }
            }}
            style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: foreground,
              alignItems: 'center', justifyContent: 'center' }}>
            {step > 0 || session || afterSignup === 'yes' ? <MaterialCommunityIcons
              name={step > 0 ? 'arrow-left' : 'close'} size={23} color={foreground} /> : null}
          </Pressable>
          <View accessibilityLabel={`Étape ${step + 1} sur ${questions.length}`}
            style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
            {questions.map((_, i) => <View key={i} style={{ flex: 1, height: 6,
              borderRadius: 3, backgroundColor: i <= step ? foreground : 'transparent',
              borderWidth: i <= step ? 0 : 1, borderColor: foreground }} />)}
          </View>
        </View>
        <View style={{ paddingTop: wheelPage ? 28 : 18, gap: 8,
          alignItems: wheelPage ? 'center' : 'flex-start' }}>
          {wheelPage ? null : <Text style={{ color: foreground, fontSize: 11, fontWeight: '900',
            letterSpacing: 2 }}>TON PROFIL DE COURSE</Text>}
          <Text style={{ color: foreground, fontSize: wheelPage ? 30 : 34,
            lineHeight: wheelPage ? 36 : 40, textAlign: wheelPage ? 'center' : 'left',
            fontWeight: '900', letterSpacing: -1.3 }}>{current.title}</Text>
          {wheelPage ? null : <Text style={{ color: foreground, fontSize: 14,
            lineHeight: 20 }}>{current.hint}</Text>}
        </View>
        <View style={{ flex: 1, minHeight: 180, justifyContent: 'center', paddingVertical: 8 }}>
          {step === 0 ? hydrated ? <NumberWheel value={Number(form.age)} min={10} max={110}
            fallback={19} unit="ans"
            onChange={(age) => { setError(''); setForm((current) => ({ ...current, age: String(age) })); }} />
            : null : step === 1 ? <WeightRuler valueKg={Number(form.weight)}
              onChange={(weight) => { setError(''); setForm((current) => ({ ...current, weight: String(weight) })); }} />
            : step === 2 ? hydrated ? <HeightRuler valueCm={Number(form.height)}
              onChange={(height) => { setError(''); setForm((current) => ({ ...current, height: String(height) })); }} />
              : null : <View style={{ gap: 14 }}>
            {(step === 3 ? levelOptions : frequencyOptions).map((option) => {
              const selected = step === 3 ? form.level === option.value : form.runs === option.value;
              return <Pressable key={String(option.value)} accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setError('');
                  if (step === 3) setForm({ ...form, level: option.value as RunningLevel });
                  else setForm({ ...form, runs: option.value as 1 | 3 | 5 });
                }}
                style={{ minHeight: 84, borderWidth: 1, borderColor: '#000000',
                  borderRadius: 20, backgroundColor: selected ? '#000000' : '#FFFFFF',
                  paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: selected ? '#FFFFFF' : '#000000',
                  fontSize: 19, fontWeight: '800' }}>{option.label}</Text>
                <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1,
                  borderColor: selected ? '#FFFFFF' : '#000000',
                  alignItems: 'center', justifyContent: 'center' }}>
                  {selected ? <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" /> : null}
                </View>
              </Pressable>;
            })}
          </View>}
        </View>
        <View style={{ gap: 8 }}>
          {runnerProfile.isError && session ? <Pressable accessibilityRole="button"
            onPress={() => void runnerProfile.refetch()}>
            <Text style={{ color: foreground, fontSize: 13 }}>Profil indisponible. Appuie pour réessayer.</Text>
          </Pressable> : null}
          {error ? <Text style={{ color: foreground, fontSize: 13 }}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={busy || !hydrated} onPress={() => void advance()}
            style={{ minHeight: 60, borderRadius: 14, backgroundColor: buttonBackground,
              alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: buttonForeground, fontSize: 16, fontWeight: '900' }}>
              {step === 4 ? (session || afterSignup === 'yes' ? 'Enregistrer mon profil' : 'Créer mon compte')
                : wheelPage ? 'Continuer  →' : 'Suivant'}
            </Text>
          </Pressable>
          {step === 0 ? <Pressable accessibilityRole="button" disabled={busy || !hydrated} onPress={() => void advance(true)}
            style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ color: foreground, fontSize: 12 }}>Passer cette question</Text>
          </Pressable> : null}
        </View>
      </ScrollView>
  </SafeAreaView>;
}
