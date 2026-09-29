import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Text } from 'react-native';
import { Button, Eyebrow, Field, Page, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { supabase } from '@/services/supabase';

export default function Register() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState(false);
  async function submit() {
    const handle = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
      setError('Pseudo : 3 à 24 lettres, chiffres ou _'); return;
    }
    if (password.length < 8) { setError('Mot de passe : 8 caractères minimum.'); return; }
    setBusy(true); setError('');
    const result = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { username: handle, display_name: name.trim() } },
    });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else if (result.data.session) router.replace('/(tabs)');
    else setVerifyEmail(true);
  }
  return <Page><Text style={{ color: palette.accent, fontSize: 28, fontWeight: '900', paddingTop: 28 }}>ÉLAN /</Text>
    <Eyebrow>NOUVEAU DÉPART</Eyebrow><Title>Crée ton espace.</Title>
    {verifyEmail ? <>
      <Text style={{ color: palette.text, fontSize: 18, lineHeight: 26 }}>Un lien de confirmation a été envoyé. Ouvre ton e-mail, puis connecte-toi.</Text>
      <Button label="SE CONNECTER" onPress={() => router.replace('/(auth)/login')} />
    </> : <>
      <Field accessibilityLabel="Nom" placeholder="Ton nom" value={name} onChangeText={setName} />
      <Field accessibilityLabel="Pseudo" placeholder="Pseudo unique" autoCapitalize="none" value={username} onChangeText={setUsername} />
      <Field accessibilityLabel="E-mail" placeholder="Adresse e-mail" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Field accessibilityLabel="Mot de passe" placeholder="Mot de passe (8 caractères minimum)" secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={{ color: palette.error }}>{error}</Text> : null}
      <Button label={busy ? 'CRÉATION…' : 'CRÉER MON COMPTE'} disabled={busy || !name || !username || !email || !password} onPress={submit} />
      <Link href="/(auth)/login" style={{ color: palette.accent, textAlign: 'center', padding: 14 }}>J’ai déjà un compte</Link>
    </>}
  </Page>;
}
