import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/typography';
import { AuthScreen, type AuthMethod } from '@/features/auth/auth-screen';
import { loadRunnerProfileDraft, pendingRunnerProfileUserKey, runnerProfileDraftKey } from '@/features/onboarding/runner-profile-draft';
import { supabase } from '@/services/supabase';

const ink = '#000000';
const paper = '#FFFFFF';
const green = '#9DF298';
const activeGreen = '#00C900';

export default function Register() {
  const [method, setMethod] = useState<AuthMethod>('email');
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const fields = [
    { label: 'Adresse e-mail', placeholder: 'ton@email.com', value: email, change: setEmail },
    { label: 'Nom', placeholder: 'Ton nom', value: name, change: setName },
    { label: 'Pseudo', placeholder: 'Choisis ton pseudo', value: username, change: setUsername },
    { label: 'Mot de passe', placeholder: 'Ton mot de passe', value: password, change: setPassword },
  ];
  const visibleFields = step === 0 ? [0] : step === 1 ? [1, 2] : [3];
  function validate(index: number) {
    if (index === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Entre une adresse e-mail valide.';
    if (index === 1 && !name.trim()) return 'Entre ton nom.';
    if (index === 2 && !/^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase())) return 'Pseudo : 3 à 24 lettres, chiffres ou _.';
    if (index === 3 && password.length < 8) return 'Ton mot de passe doit contenir au moins 8 caractères.';
    return '';
  }
  async function next() {
    if (submitting.current) return;
    const validation = visibleFields.map(validate).find(Boolean) ?? '';
    setError(validation);
    if (validation) return;
    if (step < 2) { setStep(step + 1); return; }
    const invalidStep = fields.findIndex((_, index) => !!validate(index));
    if (invalidStep !== -1) { setStep(invalidStep === 0 ? 0 : invalidStep === 3 ? 2 : 1); setError(validate(invalidStep)); return; }
    submitting.current = true; setBusy(true);
    try {
      const runnerProfile = await loadRunnerProfileDraft();
      const result = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { username: username.trim().toLowerCase(),
          display_name: name.trim(), runner_profile: runnerProfile } },
      });
      if (result.error) { setError(result.error.message); return; }
      if (!result.data.session && result.data.user) {
        await AsyncStorage.setItem(pendingRunnerProfileUserKey, result.data.user.id);
      }
      if (result.data.session) void AsyncStorage.removeItem(runnerProfileDraftKey).catch(() => undefined);
      router.replace({ pathname: '/(auth)/course-setup', params: {
        email: email.trim(), confirmation: result.data.session ? 'no' : 'yes',
      } });
    } catch { setError('Création impossible. Vérifie ta connexion et réessaie.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  if (method !== 'email') return <AuthScreen key={method} initialMethod={method} intent="register"
    onMethodChange={setMethod} onBack={() => setMethod('email')} />;
  return <SafeAreaView style={{ flex: 1, backgroundColor: paper }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1,
        paddingHorizontal: 25, paddingTop: 20, paddingBottom: 28 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" disabled={busy}
          onPress={() => {
            if (step > 0) { setStep(step - 1); setError(''); }
            else router.replace('/(auth)/welcome');
          }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF3F4',
            alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={ink} />
        </Pressable>
        <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: ink, fontSize: 28,
          fontWeight: '700', letterSpacing: -0.8, marginTop: 29 }}>
          {step === 0 ? 'Create your account' : step === 1 ? 'Ton nom et ton pseudo' : 'Ton mot de passe'}
        </Text>
        <>
          {step === 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40 }}>
            {([{ id: 'phone', label: 'Phone Number' }, { id: 'email', label: 'Email' },
              { id: 'social', label: 'Social' }] as const).map((tab) => <Pressable key={tab.id}
                accessibilityRole="tab" accessibilityState={{ selected: tab.id === 'email' }} disabled={busy}
                onPress={() => {
                  setMethod(tab.id);
                }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: tab.id === 'email' ? activeGreen : ink,
                  fontSize: 18, fontWeight: tab.id === 'email' ? '800' : '400' }}>{tab.label}</Text>
              </Pressable>)}
          </View> : null}
          <View style={{ marginTop: 48, gap: 26 }}>
            {visibleFields.map((index) => {
              const current = fields[index];
              return <View key={index}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
              <TextInput accessibilityLabel={current.label} value={current.value}
                onChangeText={(value) => { current.change(value); setError(''); }} editable={!busy}
                autoCapitalize={index === 1 ? 'words' : 'none'} autoCorrect={false}
                keyboardType={index === 0 ? 'email-address' : 'default'} secureTextEntry={index === 3}
                textContentType={index === 0 ? 'emailAddress' : index === 1 ? 'name' : index === 2 ? 'username' : 'newPassword'}
                maxLength={index === 0 ? 254 : index === 1 ? 80 : index === 2 ? 24 : undefined}
                placeholder={current.placeholder} placeholderTextColor={ink} selectionColor={activeGreen}
                returnKeyType={index === 3 ? 'done' : 'next'} onSubmitEditing={() => void next()}
                style={{ flex: 1, minWidth: 0, color: ink, fontSize: 20, minHeight: 44, padding: 0 }} />
              <Pressable accessibilityRole="button" accessibilityLabel="Effacer" disabled={busy}
                onPress={() => current.change('')}
                style={{ width: 34, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="close" size={25} color={ink} />
              </Pressable>
            </View>
            {index === 2 || index === 3 ? <Text style={{ color: ink, fontSize: 13, marginTop: 18 }}>
              {index === 2 ? '3 à 24 lettres, chiffres ou _.' : '8 caractères minimum.'}
            </Text> : null}
              </View>;
            })}
            {error ? <Text accessibilityRole="alert" style={{ color: ink, fontSize: 14, marginTop: 20 }}>{error}</Text> : null}
          </View>
        </>
        <View style={{ flex: 1, minHeight: 90 }} />
        <Pressable accessibilityRole="button" disabled={busy}
          onPress={() => void next()}
          style={({ pressed }) => ({ height: 66, borderRadius: 23, backgroundColor: green,
            alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Text style={{ color: ink, fontSize: 22, fontWeight: '800' }}>
            {busy ? 'Création…' : step === 2 ? 'Créer mon compte' : 'Next'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy}
          onPress={() => router.replace({ pathname: '/(auth)/login', params: { method: 'email' } })}
          style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: ink, fontSize: 14 }}>J’ai déjà un compte</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
