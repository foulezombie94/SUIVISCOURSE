import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS, Platform } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { palette } from '@/constants/palette';
import { fonts } from '@/constants/typography';

const normalColor = Platform.OS === 'ios'
  ? DynamicColorIOS({ dark: '#FFFFFF', light: '#000000' }) : palette.text;
const activeColor = Platform.OS === 'ios'
  ? DynamicColorIOS({ dark: '#FFFFFF', light: '#000000' }) : palette.accent;

export default function TabLayout() {
  const { session, ready } = useAuth();
  if (ready && !session) return <Redirect href="/(auth)/login" />;
  return <NativeTabs backgroundColor={palette.surface} tintColor={activeColor}
    iconColor={{ default: normalColor, selected: activeColor }}
    labelStyle={{ default: { color: normalColor, fontFamily: fonts.bold, fontSize: 12, fontWeight: '700' },
      selected: { color: activeColor, fontFamily: fonts.bold, fontSize: 12, fontWeight: '800' } }}>
    <NativeTabs.Trigger name="index">
      <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="programme">
      <NativeTabs.Trigger.Icon sf={{ default: 'list.clipboard', selected: 'list.clipboard.fill' }} md="assignment_turned_in" />
      <NativeTabs.Trigger.Label>Programme</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="run">
      <NativeTabs.Trigger.Icon sf="figure.run" md="directions_run" />
      <NativeTabs.Trigger.Label>RUN</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="friends">
      <NativeTabs.Trigger.Icon sf="person.2" md="group" />
      <NativeTabs.Trigger.Label>Amis</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="profile">
      <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
    </NativeTabs.Trigger>
  </NativeTabs>;
}
