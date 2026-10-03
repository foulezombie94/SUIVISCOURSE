import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/supabase';

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = 'google' | 'apple';
export type AuthMethods = { phone: boolean; google: boolean; apple: boolean };

export async function getAuthMethods(): Promise<AuthMethods> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
  });
  if (!response.ok) throw new Error('Méthodes de connexion indisponibles.');
  const data = await response.json() as { external?: Partial<AuthMethods> };
  return { phone: data.external?.phone === true,
    google: data.external?.google === true, apple: data.external?.apple === true };
}

let lastCompletion: { url: string; promise: ReturnType<typeof readOAuthSession> } | null = null;

export function completeOAuth(url: string) {
  if (lastCompletion?.url === url) return lastCompletion.promise;
  const promise = readOAuthSession(url);
  lastCompletion = { url, promise };
  return promise;
}

async function readOAuthSession(url: string) {
  const parsed = new URL(url);
  const fragment = new URLSearchParams(parsed.hash.slice(1));
  if (parsed.searchParams.get('error') || fragment.get('error')) {
    throw new Error('Connexion refusée. Réessaie.');
  }
  const code = parsed.searchParams.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (!accessToken || !refreshToken) throw new Error('Connexion incomplète. Réessaie.');
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken, refresh_token: refreshToken,
  });
  if (error) throw error;
  return data.session;
}

export async function signInSocial(provider: SocialProvider) {
  lastCompletion = null;
  const redirectTo = makeRedirectUri({ scheme: 'elanrunning', path: 'auth/callback' });
  const { data, error } = await supabase.auth.signInWithOAuth({ provider,
    options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw error;
  if (!data.url) throw new Error('Connexion indisponible.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  return result.type === 'success' ? completeOAuth(result.url) : null;
}
