import type { ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View, type PressableProps, type TextInputProps } from 'react-native';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@/constants/palette';
import { fonts } from '@/constants/typography';

export function Page({ children, scroll = true, bottom = false, backgroundColor = palette.bg }: {
  children: ReactNode; scroll?: boolean; bottom?: boolean; backgroundColor?: string;
}) {
  return <SafeAreaView style={{ flex: 1, backgroundColor }} edges={bottom ? ['top', 'bottom'] : ['top']}>
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
  return <View style={[{ backgroundColor: palette.surface, borderColor: palette.line,
    borderWidth: 1, borderRadius: 20, padding: 20, gap: 12 }, style]}>{children}</View>;
}
export function Button({ label, tone = 'accent', inverted = false, ...props }: PressableProps & {
  label: string; tone?: 'accent' | 'muted' | 'danger'; inverted?: boolean;
}) {
  const backgroundColor = inverted ? tone === 'muted' ? palette.accent : palette.bg
    : tone === 'accent' ? palette.accent : tone === 'danger' ? palette.error : palette.surfaceAlt;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} {...props}
    style={({ pressed }) => [{
      minHeight: 54, backgroundColor, borderRadius: 18, alignItems: 'center',
      borderWidth: tone === 'muted' ? 1 : 0,
      borderColor: inverted ? palette.bg : palette.line,
      justifyContent: 'center', paddingHorizontal: 18,
      transform: [{ scale: pressed && !props.disabled ? 0.98 : 1 }],
    }, typeof props.style === 'function' ? props.style({ pressed }) : props.style]}>
    <Text style={{ color: inverted ? tone === 'muted' ? palette.bg : palette.text
      : tone === 'muted' ? palette.text : palette.accentText,
      fontSize: 15, fontWeight: '900', letterSpacing: 0.3 }}>{label}</Text>
  </Pressable>;
}
export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={palette.muted} {...props}
    style={[{ backgroundColor: palette.surface, color: palette.text, minHeight: 54,
      borderRadius: 16, borderWidth: 1, borderColor: palette.line,
      paddingHorizontal: 17, fontSize: 16, fontFamily: fonts.regular }, props.style]} />;
}
export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <Panel style={{ alignItems: 'center', paddingVertical: 32 }}>
    <Text style={{ color: palette.accent, fontSize: 36 }}>◌</Text>
    <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
    <Text style={{ color: palette.muted, lineHeight: 21, textAlign: 'center' }}>{body}</Text>
    {action}
  </Panel>;
}
