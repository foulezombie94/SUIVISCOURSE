import { createButton } from '@gluestack-ui/core/button/creator';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/typography';

// gluestack's accessible component creators, styled with Élan's existing native styles.
export const Button = createButton({ Root: Pressable, Text, Group: View, Spinner: ActivityIndicator, Icon: View });
export const ButtonText = Button.Text;
export const ButtonSpinner = Button.Spinner;
