import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/typography';
import { completeOAuth } from '@/services/auth-login';
import { getRunnerProfile } from '@/services/runner-profile';

export default function AuthCallback() {
  const url = Linking.useLinkingURL();
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    void (async () => {
      const session = await completeOAuth(url);
      if (!session) throw new Error('Session absente');
      await getRunnerProfile(session.user.id, session.user.user_metadata?.runner_profile);
      if (alive) router.replace('/(tabs)');
    })().catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [url]);
  return <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
    {error ? <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')}>
      <Text style={{ color: '#000000', textAlign: 'center' }}>Connexion impossible. Appuie pour réessayer.</Text>
    </Pressable> : <ActivityIndicator color="#000000" size="large" />}
  </View>;
}
