import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { Empty, Eyebrow, Page, Panel, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { profilesByIds } from '@/services/friends';
export default function FriendProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['friend-profile', id],
    queryFn: () => profilesByIds([id ?? '']), enabled: !!id });
  const friend = query.data?.[0];
  return <Page><Eyebrow>PROFIL AMI</Eyebrow>
    {friend ? <><Title>{friend.display_name}</Title>
      <Panel><Text style={{ color: palette.accent, fontSize: 18 }}>@{friend.username}</Text>
        <Text style={{ color: palette.text }}>{friend.bio || 'Ce coureur n’a pas encore ajouté de bio.'}</Text>
      </Panel></> : query.isPending ? <Text style={{ color: palette.muted }}>Chargement…</Text>
      : <Empty title="Profil indisponible" body="Cette personne n’est plus dans tes amis." />}
  </Page>;
}
