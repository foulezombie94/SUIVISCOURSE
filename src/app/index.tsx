import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { useRunStore } from '@/store/run-store';
import { palette } from '@/constants/palette';
export default function Entry() {
  const { ready, session, onboardingSeen } = useAuth();
  const active = useRunStore((state) => state.active);
  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.bg, justifyContent: 'center' }}>
    <ActivityIndicator size="large" color={palette.accent} />
  </View>;
  if (!onboardingSeen) return <Redirect href="/(auth)/onboarding" />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (active) return <Redirect href="/run/active" />;
  return <Redirect href="/(tabs)" />;
}
