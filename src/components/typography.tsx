import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';
import { fonts } from '@/constants/typography';

export function Text({ style, ...props }: TextProps) {
  const flattened = StyleSheet.flatten(style);
  if (flattened?.fontFamily) return <NativeText style={style} {...props} />;
  const weight = flattened?.fontWeight;
  const numericWeight = weight === 'bold' ? 700 : weight === 'normal' || !weight ? 400 : Number(weight);
  const fontFamily = numericWeight >= 700 ? fonts.bold : numericWeight >= 500 ? fonts.medium : fonts.regular;
  return <NativeText style={[style, { fontFamily, fontWeight: 'normal' }]} {...props} />;
}
