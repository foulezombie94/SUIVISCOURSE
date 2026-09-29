import { Text as NativeText, type TextProps } from 'react-native';
import { fonts } from '@/constants/typography';

export function Text({ style, ...props }: TextProps) {
  return <NativeText style={[{ fontFamily: fonts.regular }, style]} {...props} />;
}
