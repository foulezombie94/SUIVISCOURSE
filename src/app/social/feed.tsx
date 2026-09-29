import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FriendActivityTile } from '@/components/friend-activity-tile';
import { Button, Eyebrow, Empty, Title } from '@/components/ui';
import { palette } from '@/constants/palette';
import { useAuth } from '@/features/auth/auth-provider';
import { listFriendFeed } from '@/services/feed';

export default function FriendFeedScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const feed = useInfiniteQuery({ queryKey: ['friend-feed', userId], enabled: !!userId,
    initialPageParam: 0, queryFn: ({ pageParam }) => listFriendFeed(userId, pageParam, 15),
    getNextPageParam: (last, pages) => last.length === 15 ? pages.length : undefined });
  const items = feed.data?.pages.flat() ?? [];
  return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top']}>
    <FlatList data={items} keyExtractor={(item) => item.activity.activity_id}
      contentContainerStyle={{ padding: 24, paddingBottom: 100, gap: 14 }}
      ListHeaderComponent={<View style={{ gap: 10, paddingBottom: 12 }}>
        <Eyebrow>ENTRE VRAIS AMIS</Eyebrow><Title>Leurs courses.</Title>
        <Text style={{ color: palette.muted }}>Seulement les sorties qu’ils ont choisi de partager.</Text>
      </View>}
      renderItem={({ item }) => <FriendActivityTile item={item} />}
      ListEmptyComponent={feed.isPending ? <ActivityIndicator color={palette.accent} />
        : feed.isError ? <Empty title="Fil indisponible" body="Vérifie ta connexion."
            action={<Button label="RÉESSAYER" onPress={() => feed.refetch()} />} />
          : <Empty title="Aucune course partagée" body="Ajoute des amis et attends leur prochaine sortie." />}
      ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={palette.accent} /> : null}
      onEndReachedThreshold={0.4}
      onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }} />
  </SafeAreaView>;
}
