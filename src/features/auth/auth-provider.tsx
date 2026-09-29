import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/services/supabase';
import { syncPending } from '@/services/activities';
import { useRunStore } from '@/store/run-store';

type State = {
  ready: boolean; session: Session | null; onboardingSeen: boolean;
  finishOnboarding: () => Promise<void>;
};
const AuthContext = createContext<State | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const restore = useRunStore((state) => state.restore);
  useEffect(() => {
    let mounted = true;
    void Promise.all([supabase.auth.getSession(), AsyncStorage.getItem('onboarding-seen')])
      .then(([result, seen]) => {
        if (!mounted) return;
        setSession(result.data.session);
        setOnboardingSeen(seen === 'yes');
      }).finally(() => { if (mounted) setReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!session?.user.id) return;
    const id = session.user.id;
    void restore(id);
    void syncPending(id).catch(() => undefined);
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) void syncPending(id).catch(() => undefined);
    });
    return unsubscribe;
  }, [session?.user.id, restore]);
  return <AuthContext.Provider value={{ ready, session, onboardingSeen,
    finishOnboarding: async () => {
      await AsyncStorage.setItem('onboarding-seen', 'yes');
      setOnboardingSeen(true);
    } }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider manquant');
  return value;
}
