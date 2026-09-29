import { Platform } from 'react-native';

const system = Platform.select({ ios: 'system-ui', android: 'sans-serif', default: 'system-ui' })!;
const rounded = Platform.select({ ios: 'ui-rounded', android: 'sans-serif-rounded', default: 'ui-rounded' })!;

export const fonts = {
  regular: system,
  medium: system,
  bold: system,
  mono: rounded,
  monoBold: rounded,
} as const;
