import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/features/auth/auth-provider';
import { palette } from '@/constants/palette';

const queryClient = new QueryClient({ defaultOptions: {
  queries: { staleTime: 30_000, retry: 1 },
} });
const appTheme = { ...DarkTheme, colors: { ...DarkTheme.colors,
  background: palette.bg, card: palette.surface, text: palette.text,
  primary: palette.accent, border: palette.line } };
export default function RootLayout() {
  return <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider value={appTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="run/active" options={{ gestureEnabled: false }} />
        <Stack.Screen name="run/summary" />
        <Stack.Screen name="activity/[id]" />
        <Stack.Screen name="card/[id]" />
        <Stack.Screen name="social/battles" />
        <Stack.Screen name="social/challenges" />
        <Stack.Screen name="social/leaderboard" />
        <Stack.Screen name="social/notifications" />
        <Stack.Screen name="social/feed" />
        <Stack.Screen name="goals" />
      </Stack>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>;
}
