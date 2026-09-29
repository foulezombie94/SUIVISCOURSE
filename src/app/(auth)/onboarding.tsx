import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/typography';
import { Button, Eyebrow, Page } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';

const pages = [
  { label: 'BIENVENUE', title: 'RUN.\nPROGRESS.\nREPEAT.', body: 'Chaque sortie te rapproche de ta prochaine version.' },
  { label: 'AVEC TES AMIS', title: 'PLUS LOIN\nENSEMBLE.', body: 'Ajoute tes vrais amis avec un code. Lance des défis, sans likes ni fil public.' },
  { label: 'TA VIE PRIVÉE', title: 'TA COURSE.\nTON CHOIX.', body: 'Tes tracés restent privés. Le GPS est demandé seulement quand tu démarres. Dans Expo Go, garde l’app ouverte pendant ta course.' },
];
export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const { finishOnboarding } = useAuth();
  const page = pages[index];
  return <Page scroll={false}><View style={{ flex: 1, padding: 27, paddingTop: 76, justifyContent: 'space-between' }}>
    <View style={{ gap: 28 }}>
      <Text style={{ color: palette.accent, fontSize: 29, fontWeight: '900' }}>ÉLAN /</Text>
      <Eyebrow>{page.label}</Eyebrow>
      <Text style={{ color: palette.text, fontSize: 51, lineHeight: 57, fontWeight: '900', letterSpacing: -2 }}>{page.title}</Text>
      <Text style={{ color: palette.muted, fontSize: 17, lineHeight: 26 }}>{page.body}</Text>
    </View>
    <View style={{ gap: 18, paddingBottom: 26 }}>
      <Text style={{ color: palette.accent, letterSpacing: 9 }}>{pages.map((_, i) => i === index ? '●' : '○').join('')}</Text>
      <Button label={index === pages.length - 1 ? 'COMMENCER' : 'CONTINUER'} onPress={async () => {
        if (index < pages.length - 1) setIndex(index + 1);
        else { await finishOnboarding(); router.replace('/(auth)/register'); }
      }} />
    </View>
  </View></Page>;
}
