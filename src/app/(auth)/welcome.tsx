import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/typography';
import { fonts } from '@/constants/typography';

const ink = '#000000';
const paper = '#FFFFFF';
const lime = '#B9F532';

export default function Welcome() {
  const { width } = useWindowDimensions();
  const headlineSize = Math.min(52, (width - 56) / 7);
  return <SafeAreaView style={{ flex: 1, backgroundColor: paper }} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 20 }}>
      <Text style={{ color: ink, fontFamily: fonts.monoBold, fontSize: 25,
        fontWeight: '900', letterSpacing: -1.5 }}>ÉLAN /</Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: lime,
          alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <MaterialCommunityIcons name="run-fast" size={39} color={ink} />
        </View>
        <Text style={{ color: ink, fontSize: 16, fontWeight: '800', letterSpacing: 2.5,
          marginBottom: 10 }}>WELCOME TO ÉLAN</Text>
        <Text style={{ color: ink, fontSize: headlineSize, lineHeight: headlineSize * 1.08,
          fontWeight: '900', letterSpacing: -2.5 }}>Chaque course{ '\n' }commence ici.</Text>
        <View style={{ height: 3, backgroundColor: ink, marginTop: 30, marginBottom: 18 }} />
        <Text style={{ color: ink, fontSize: 16, lineHeight: 23 }}>
          Suis tes sorties, découvre tes progrès et cours avec tes amis.
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Commencer"
        onPress={() => router.push('/(auth)/register')}
        style={({ pressed }) => ({ height: 68, borderRadius: 22, backgroundColor: lime,
          alignItems: 'center', justifyContent: 'center',
          transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Text style={{ color: ink, fontSize: 19, fontWeight: '900' }}>GET STARTED  →</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="J’ai déjà un compte"
        onPress={() => router.push('/(auth)/login')}
        style={{ minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 9 }}>
        <Text style={{ color: ink, fontSize: 15, fontWeight: '800' }}>J’ai déjà un compte</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
}
