import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { Text } from '@/components/typography';
import { getAuthMethods, signInSocial, type SocialProvider } from '@/services/auth-login';
import { getRunnerProfile } from '@/services/runner-profile';
import { supabase } from '@/services/supabase';

const ink = '#000000';
const paper = '#FFFFFF';
const green = '#9DF298';
const activeGreen = '#00C900';
const countries = [
  { name: 'France', flag: '🇫🇷', prefix: '+33' },
  { name: 'États-Unis / Canada', flag: '🇺🇸', prefix: '+1' },
  { name: 'Belgique', flag: '🇧🇪', prefix: '+32' },
  { name: 'Suisse', flag: '🇨🇭', prefix: '+41' },
  { name: 'Royaume-Uni', flag: '🇬🇧', prefix: '+44' },
] as const;
export type AuthMethod = 'phone' | 'email' | 'social';
type Step = 'entry' | 'password' | 'code';

export function AuthScreen({ initialMethod = 'phone', intent = 'login', onMethodChange, onBack }: {
  initialMethod?: AuthMethod;
  intent?: 'login' | 'register';
  onMethodChange?: (method: AuthMethod) => void;
  onBack?: () => void;
}) {
  const [method, setMethod] = useState<AuthMethod>(initialMethod);
  const [step, setStep] = useState<Step>('entry');
  const [country, setCountry] = useState<(typeof countries)[number]>(countries[0]);
  const [countryVisible, setCountryVisible] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [provider, setProvider] = useState<SocialProvider>('google');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const methods = useQuery({ queryKey: ['auth-methods'], queryFn: getAuthMethods,
    staleTime: 5 * 60_000, retry: 1 });
  const unavailable = method === 'phone' ? methods.data?.phone === false
    : method === 'social' ? methods.data?.[provider] === false : false;
  const fullPhone = country.prefix + phone.replace(/\D/g, '').replace(/^0/, '');
  const value = step === 'code' ? code : step === 'password' ? password : method === 'phone' ? phone : email;
  const changeValue = step === 'code' ? setCode : step === 'password' ? setPassword : method === 'phone' ? setPhone : setEmail;

  function chooseMethod(next: AuthMethod) {
    if (busy) return;
    setMethod(next); setStep('entry'); setPassword(''); setCode(''); setError('');
    onMethodChange?.(next);
  }
  async function finishLogin(session: Session) {
    await getRunnerProfile(session.user.id, session.user.user_metadata?.runner_profile);
    router.replace('/(tabs)');
  }
  async function next() {
    if (submitting.current) return;
    setError('');
    if (unavailable) {
      setError('Ce mode de connexion est momentanément indisponible. Utilise Email.'); return;
    }
    if (method === 'email' && step === 'entry') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Entre une adresse e-mail valide.'); return;
      }
      setStep('password'); return;
    }
    if (method === 'phone' && step === 'entry' && !/^\+[1-9]\d{7,14}$/.test(fullPhone)) {
      setError('Entre un numéro de téléphone valide.'); return;
    }
    if (step === 'code' && !/^\d{6}$/.test(code)) {
      setError('Entre le code à 6 chiffres reçu par SMS.'); return;
    }
    if (step === 'password' && !password) { setError('Entre ton mot de passe.'); return; }
    submitting.current = true; setBusy(true);
    try {
      if (method === 'social') {
        const session = await signInSocial(provider);
        if (session) await finishLogin(session);
      } else if (method === 'email') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        if (data.session) await finishLogin(data.session);
      } else if (step === 'entry') {
        const { error: authError } = await supabase.auth.signInWithOtp({ phone: fullPhone });
        if (authError) throw authError;
        setStep('code');
      } else {
        const { data, error: authError } = await supabase.auth.verifyOtp({ phone: fullPhone, token: code, type: 'sms' });
        if (authError) throw authError;
        if (data.session) await finishLogin(data.session);
      }
    } catch {
      setError(step === 'code' ? 'Code incorrect ou expiré. Réessaie.'
        : 'Connexion impossible. Vérifie tes informations et réessaie.');
    } finally { submitting.current = false; setBusy(false); }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: paper }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1,
        paddingHorizontal: 25, paddingTop: 20, paddingBottom: 28 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" disabled={busy}
          onPress={() => {
            if (step !== 'entry') { setStep('entry'); setError(''); setCode(''); }
            else if (onBack) onBack();
            else router.replace('/(auth)/welcome');
          }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF3F4',
            alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={ink} />
        </Pressable>
        <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: ink, fontSize: 28,
          fontWeight: '700', letterSpacing: -0.8, marginTop: 29 }}>
          {intent === 'register' ? 'Create your account' : 'Sign in'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40 }}>
          {([{ id: 'phone', label: 'Phone Number' }, { id: 'email', label: 'Email' },
            { id: 'social', label: 'Social' }] as const).map((tab) => <Pressable key={tab.id}
              accessibilityRole="tab" accessibilityState={{ selected: method === tab.id }}
              disabled={busy} onPress={() => chooseMethod(tab.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: method === tab.id ? activeGreen : ink,
                fontSize: 18, fontWeight: method === tab.id ? '800' : '400' }}>{tab.label}</Text>
            </Pressable>)}
        </View>
        <View style={{ marginTop: 48 }}>
          {method === 'social' ? <View style={{ gap: 14 }}>
            {(['google', 'apple'] as const).map((choice) => <Pressable key={choice}
              accessibilityRole="radio" accessibilityState={{ checked: provider === choice }} disabled={busy}
              onPress={() => { setProvider(choice); setError(''); }}
              style={{ minHeight: 60, borderWidth: 1, borderColor: ink, borderRadius: 18,
                paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
                backgroundColor: provider === choice ? green : paper }}>
              <MaterialCommunityIcons name={choice === 'google' ? 'google' : 'apple'} size={25} color={ink} />
              <Text style={{ flex: 1, fontSize: 18, color: ink }}>Continuer avec {choice === 'google' ? 'Google' : 'Apple'}</Text>
              {provider === choice ? <MaterialCommunityIcons name="check" size={22} color={ink} /> : null}
            </Pressable>)}
          </View> : <>
            {step !== 'entry' ? <Text style={{ color: ink, marginBottom: 15, fontSize: 14 }}>
              {step === 'code' ? `Code envoyé au ${fullPhone}` : email.trim()}
            </Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
              {method === 'phone' && step === 'entry' ? <Pressable accessibilityRole="button"
                accessibilityLabel="Choisir l’indicatif du pays" disabled={busy} onPress={() => setCountryVisible(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 44 }}>
                <Text style={{ fontSize: 23 }}>{country.flag}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={ink} />
                <Text style={{ color: ink, fontSize: 20 }}>{country.prefix}</Text>
              </Pressable> : null}
              <TextInput key={`${method}-${step}`} accessibilityLabel={step === 'code' ? 'Code SMS'
                : step === 'password' ? 'Mot de passe' : method === 'phone' ? 'Téléphone' : 'E-mail'}
                value={value} onChangeText={changeValue} editable={!busy} autoCapitalize="none" autoCorrect={false}
                secureTextEntry={step === 'password'} maxLength={step === 'code' ? 6 : undefined}
                keyboardType={step === 'code' ? 'number-pad' : step === 'password' ? 'default'
                  : method === 'phone' ? 'phone-pad' : 'email-address'}
                textContentType={step === 'code' ? 'oneTimeCode' : step === 'password' ? 'password'
                  : method === 'phone' ? 'telephoneNumber' : 'emailAddress'}
                placeholder={step === 'code' ? 'Code SMS' : step === 'password' ? 'Mot de passe'
                  : method === 'phone' ? '6 12 34 56 78' : 'ton@email.com'}
                placeholderTextColor={ink} selectionColor={activeGreen}
                returnKeyType="next" onSubmitEditing={() => void next()}
                style={{ flex: 1, minWidth: 0, color: ink, fontSize: 20, minHeight: 44, padding: 0 }} />
              <Pressable accessibilityRole="button" accessibilityLabel="Effacer" disabled={busy}
                onPress={() => changeValue('')} style={{ width: 34, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="close" size={25} color={ink} />
              </Pressable>
            </View>
          </>}
          {unavailable ? <Text style={{ color: ink, fontSize: 13, marginTop: 22 }}>
            Ce mode de connexion est momentanément indisponible. Tu peux utiliser Email.
          </Text> : null}
          {error ? <Text accessibilityRole="alert" style={{ color: ink, marginTop: 20, fontSize: 14 }}>{error}</Text> : null}
          {step === 'password' ? <Pressable accessibilityRole="button"
            onPress={() => router.push('/(auth)/register')}
            style={{ paddingVertical: 18 }}><Text style={{ color: ink, fontSize: 14, textDecorationLine: 'underline' }}>
              Pas encore de compte ? Créer un compte
            </Text></Pressable> : null}
        </View>
        <View style={{ flex: 1, minHeight: 90 }} />
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void next()}
          style={({ pressed }) => ({ height: 66, borderRadius: 23, backgroundColor: green,
            alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Text style={{ color: ink, fontSize: 22, fontWeight: '800' }}>{busy ? 'Connexion…' : 'Next'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={countryVisible} transparent animationType="fade" onRequestClose={() => setCountryVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setCountryVisible(false)}
          style={{ position: 'absolute', inset: 0 }} />
        <View style={{ backgroundColor: paper, borderRadius: 24, padding: 20 }}>
          {countries.map((choice) => <Pressable key={choice.prefix} accessibilityRole="button"
            onPress={() => { setCountry(choice); setCountryVisible(false); }}
            style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 22 }}>{choice.flag}</Text>
            <Text style={{ flex: 1, color: ink, fontSize: 16 }}>{choice.name}</Text>
            <Text style={{ color: ink, fontSize: 16 }}>{choice.prefix}</Text>
          </Pressable>)}
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}
