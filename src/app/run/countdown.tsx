import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { Animated, AppState, Easing, View } from 'react-native';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/auth-provider';
import { useRunStore } from '@/store/run-store';
import type { ActivityType } from '@/types/domain';
import { fonts } from '@/constants/typography';

const ink = '#000000';
const paper = '#FFFFFF';

export default function RunCountdown() {
  const { type, autoPause } = useLocalSearchParams<{ type?: string; autoPause?: string }>();
  const { session } = useAuth();
  const start = useRunStore((state) => state.start);
  const [count, setCount] = useState(3);
  const started = useRef(false);
  const cancelled = useRef(false);
  const [pulse] = useState(() => new Animated.Value(0));
  const activityType: ActivityType = type === 'walking' || type === 'trail' ? type : 'running';

  useEffect(() => {
    const deadline = Date.now() + 3000;
    const timer = setInterval(() => {
      setCount(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 100);
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && !started.current) {
        cancelled.current = true;
        router.replace('/(tabs)/run');
      }
    });
    return () => { clearInterval(timer); appState.remove(); };
  }, []);

  useEffect(() => {
    pulse.setValue(0);
    Animated.timing(pulse, {
      toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
    if (count > 0) {
      void Haptics.selectionAsync().catch(() => undefined);
      return;
    }
    if (started.current || cancelled.current) return;
    started.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void (async () => {
      if (!session?.user.id || (AppState.currentState && AppState.currentState !== 'active')) {
        router.replace('/(tabs)/run');
        return;
      }
      const ready = await start(session.user.id, activityType, autoPause !== '0');
      if (ready && AppState.currentState && AppState.currentState !== 'active') {
        await useRunStore.getState().pause();
      }
      router.replace(ready ? '/run/active' : '/(tabs)/run');
    })();
  }, [activityType, autoPause, count, pulse, session?.user.id, start]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.1] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] });
  return <SafeAreaView style={{ flex: 1, backgroundColor: ink }} edges={['top', 'bottom']}>
    <StatusBar hidden />
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Text style={{ color: paper, fontSize: 190, fontFamily: fonts.monoBold,
          letterSpacing: -12, includeFontPadding: false }}>
          {count > 0 ? count : ''}
        </Text>
      </Animated.View>
    </View>
  </SafeAreaView>;
}
