import { useLocalSearchParams } from 'expo-router';
import { AuthScreen } from '@/features/auth/auth-screen';

export default function Login() {
  const { method } = useLocalSearchParams<{ method?: string }>();
  const selected = method === 'email' || method === 'social' ? method : 'phone';
  return <AuthScreen key={selected} initialMethod={selected} />;
}
