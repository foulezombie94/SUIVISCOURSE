import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Eyebrow, Field, Page, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { supabase } from '@/services/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setError('');
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) setError('Connexion impossible. Vérifie tes identifiants.');
    else router.replace('/(tabs)');
  }
  return <Page><Text style={{ color: palette.accent, fontSize: 28, fontWeight: '900', paddingTop: 48 }}>ÉLAN /</Text>
    <View style={{ height: 12 }} />
    <Eyebrow>TE REVOILÀ</Eyebrow><Title>Reprends ton élan.</Title>
    <Field accessibilityLabel="E-mail" placeholder="Adresse e-mail" keyboardType="email-address"
      autoCapitalize="none" value={email} onChangeText={setEmail} />
    <Field accessibilityLabel="Mot de passe" placeholder="Mot de passe" secureTextEntry
      value={password} onChangeText={setPassword} />
    {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
    <Button label={busy ? 'CONNEXION…' : 'SE CONNECTER'} disabled={busy || !email || !password} onPress={submit} />
    <Link href="/(auth)/register" style={{ color: palette.accent, textAlign: 'center', padding: 14 }}>Créer un compte</Link>
  </Page>;
}
