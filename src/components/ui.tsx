import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type PressableProps, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@/constants/palette';

export function Page({ children, scroll = true, bottom = false }: {
  children: ReactNode; scroll?: boolean; bottom?: boolean;
}) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={bottom ? ['top', 'bottom'] : ['top']}>
    {scroll
      ? <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120, gap: 20 }}>{children}</ScrollView>
      : children}
  </SafeAreaView>;
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={{ color: palette.accent, fontSize: 12, fontWeight: '900', letterSpacing: 2.2 }}>{children}</Text>;
}
export function Title({ children }: { children: ReactNode }) {
  return <Text style={{ color: palette.text, fontSize: 33, fontWeight: '900', letterSpacing: -1.2 }}>{children}</Text>;
}
export function Panel({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ backgroundColor: palette.surface, borderRadius: 25, padding: 20, gap: 12 }, style]}>{children}</View>;
}
export function Button({ label, tone = 'accent', ...props }: PressableProps & {
  label: string; tone?: 'accent' | 'muted' | 'danger';
}) {
  const backgroundColor = tone === 'accent' ? palette.accent
    : tone === 'danger' ? palette.error : palette.surfaceAlt;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} {...props}
    style={({ pressed }) => [{
      minHeight: 54, backgroundColor, borderRadius: 18, alignItems: 'center',
      justifyContent: 'center', paddingHorizontal: 18, opacity: props.disabled ? 0.5 : pressed ? 0.82 : 1,
    }, typeof props.style === 'function' ? props.style({ pressed }) : props.style]}>
    <Text style={{ color: tone === 'muted' ? palette.text : palette.accentText, fontSize: 15, fontWeight: '900', letterSpacing: 0.3 }}>{label}</Text>
  </Pressable>;
}
export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={palette.muted} {...props}
    style={[{ backgroundColor: palette.surface, color: palette.text, minHeight: 54,
      borderRadius: 16, paddingHorizontal: 17, fontSize: 16 }, props.style]} />;
}
export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <Panel style={{ alignItems: 'center', paddingVertical: 32 }}>
    <Text style={{ color: palette.accent, fontSize: 36 }}>◌</Text>
    <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
    <Text style={{ color: palette.muted, lineHeight: 21, textAlign: 'center' }}>{body}</Text>
    {action}
  </Panel>;
}
