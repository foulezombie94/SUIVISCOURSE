import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/typography';
import { useAuth } from '@/features/auth/auth-provider';

export default function CourseSetup() {
  const { session } = useAuth();
  const { email, confirmation, completed } = useLocalSearchParams<{
    email?: string; confirmation?: string; completed?: string;
  }>();
  const done = completed === 'yes';
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 25, paddingTop: 34, paddingBottom: 28 }}>
      <Text style={{ color: '#000000', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 }}>
        {done ? 'Check your email' : 'Ton profil de course'}
      </Text>
      <View style={{ marginTop: 48, gap: 22 }}>
        <MaterialCommunityIcons name={done ? 'email-check-outline' : 'run'} size={42} color="#000000" />
        <Text style={{ color: '#000000', fontSize: 21, lineHeight: 29, fontWeight: '600' }}>
          {done ? 'Encore une étape pour te connecter.' : 'Tu veux compléter tes infos maintenant ?'}
        </Text>
        <Text style={{ color: '#000000', fontSize: 16, lineHeight: 24 }}>
          {done ? `Ouvre le lien de confirmation envoyé à ${email || 'ton adresse e-mail'}, puis connecte-toi.`
            : 'Âge, poids, taille et habitudes de course. Tu peux aussi les compléter plus tard depuis ton profil.'}
        </Text>
        {!done && confirmation === 'yes' ? <Text style={{ color: '#000000', fontSize: 14, lineHeight: 21 }}>
          Un e-mail de confirmation a été envoyé. Tu devras confirmer ton adresse avant de te connecter.
        </Text> : null}
      </View>
      <View style={{ flex: 1, minHeight: 80 }} />
      <Pressable accessibilityRole="button" onPress={() => {
        if (done) router.replace({ pathname: '/(auth)/login', params: { method: 'email' } });
        else router.push({ pathname: '/(auth)/onboarding', params: { afterSignup: 'yes', email, confirmation } });
      }} style={({ pressed }) => ({ minHeight: 66, borderRadius: 23, backgroundColor: '#9DF298',
        paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Text style={{ color: '#000000', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
          {done ? 'Se connecter' : 'Remplir maintenant'}
        </Text>
      </Pressable>
      {!done ? <Pressable accessibilityRole="button" onPress={() => {
        if (session) router.replace('/(tabs)');
        else router.setParams({ completed: 'yes' });
      }} style={{ minHeight: 60, marginTop: 12, borderRadius: 23, borderWidth: 1,
        borderColor: '#000000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 }}>
        <Text style={{ color: '#000000', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
          Plus tard, dans mon profil
        </Text>
      </Pressable> : null}
    </ScrollView>
  </SafeAreaView>;
}
