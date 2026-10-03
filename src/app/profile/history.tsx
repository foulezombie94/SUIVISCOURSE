import { useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/typography';
import { HistoryCard } from '@/features/activities/history-card';
import { useActivityFavorites } from '@/features/activities/use-activity-favorites';
import { useAuth } from '@/features/auth/auth-provider';
import { listActivities } from '@/services/activities';
import type { Activity, ActivityType } from '@/types/domain';
import { formatDuration, formatKm } from '@/utils/format';

const filters: { key: 'all' | ActivityType; label: string }[] = [
  { key: 'all', label: 'Tout' }, { key: 'running', label: 'Course' },
  { key: 'walking', label: 'Marche' }, { key: 'trail', label: 'Trail' },
];
const black = '#000000';
const muted = '#6C6C6C';

export default function ProfileHistory() {
  const { session } = useAuth();
  const id = session?.user.id ?? '';
  const { favorites } = useLocalSearchParams<{ favorites?: string }>();
  const savedOnly = favorites === 'yes';
  const favoriteState = useActivityFavorites();
  const favoriteIds = useMemo(() => new Set(favoriteState.query.data?.map((item) => item.id)),
    [favoriteState.query.data]);
  const [filter, setFilter] = useState<'all' | ActivityType>('all');
  const history = useInfiniteQuery({ queryKey: ['history', id], enabled: !!id && !savedOnly, initialPageParam: 0,
    queryFn: ({ pageParam }) => listActivities(id, pageParam, 20),
    getNextPageParam: (last, all) => last.length >= 20 ? all.length : undefined });
  const { runs, sections, distance, duration } = useMemo(() => {
    const source = savedOnly ? favoriteState.query.data ?? [] : history.data?.pages.flat() ?? [];
    const unique = new Map(source.map((run) => [run.id, run]));
    const items = Array.from(unique.values()).filter((run) => filter === 'all' || run.activityType === filter)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    const months = new Map<string, { key: string; title: string; data: Activity[] }>();
    for (const activity of items) {
      const date = new Date(activity.startedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!months.has(key)) months.set(key, { key,
        title: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), data: [] });
      months.get(key)!.data.push(activity);
    }
    return { runs: items, sections: Array.from(months.values()),
      distance: items.reduce((sum, run) => sum + run.distanceMeters, 0),
      duration: items.reduce((sum, run) => sum + run.elapsedSeconds, 0) };
  }, [history.data, favoriteState.query.data, savedOnly, filter]);
  const isPending = savedOnly ? favoriteState.query.isPending : history.isPending;
  const isError = savedOnly ? favoriteState.query.isError : history.isError;
  const hasNextPage = !savedOnly && history.hasNextPage;
  const refresh = () => savedOnly ? favoriteState.query.refetch() : history.refetch();

  return <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <StatusBar style="dark" />
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24,
      paddingTop: 10, paddingBottom: 14, gap: 13 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour au profil" onPress={() => router.back()}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22,
          backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        <MaterialCommunityIcons name="arrow-left" size={23} color={black} />
      </Pressable>
      <Text style={{ flex: 1, color: black, fontSize: savedOnly ? 24 : 29, fontWeight: '700',
        letterSpacing: -0.8 }}>{savedOnly ? 'Séances enregistrées' : 'Historique'}</Text>
    </View>
    <SectionList sections={sections} keyExtractor={(item) => item.id}
      extraData={{ favorites: favoriteState.query.data, busy: favoriteState.mutation.isPending }}
      renderItem={({ item }) => <HistoryCard activity={item} isFavorite={favoriteIds.has(item.id)}
        favoriteDisabled={favoriteState.mutation.isPending || favoriteState.query.isPending || favoriteState.query.isError}
        onFavorite={() => favoriteState.mutation.mutate(item)} />}
      showsVerticalScrollIndicator={false} stickySectionHeadersEnabled
      refreshing={savedOnly ? favoriteState.query.isRefetching : history.isRefetching && !history.isFetchingNextPage}
      onRefresh={() => void refresh()}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={<View style={{ paddingHorizontal: 24 }}>
        <Text style={{ color: muted, fontSize: 14, marginBottom: 22 }}>
          {savedOnly ? 'Tes séances favorites' : 'Toutes tes séances'}</Text>
        {!savedOnly && favoriteState.query.isError ? <Pressable accessibilityRole="button"
          onPress={() => void favoriteState.query.refetch()} style={{ marginBottom: 16 }}>
          <Text style={{ color: muted, fontSize: 13 }}>Favoris indisponibles. Appuie pour réessayer.</Text>
        </Pressable> : null}
        {runs.length ? <View style={{ backgroundColor: '#202421', borderRadius: 23, padding: 22, gap: 19 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#C8CDC5', fontSize: 11, fontWeight: '600' }}>SUR CETTE LISTE</Text>
            <View style={{ width: 33, height: 33, borderRadius: 17, backgroundColor: '#B9F532',
              alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name={savedOnly ? 'star' : 'run-fast'} size={20} color={black} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 45, fontWeight: '700', letterSpacing: -1.8,
              fontVariant: ['tabular-nums'] }}>{formatKm(distance)}</Text>
            <Text style={{ color: '#C8CDC5', fontSize: 15 }}>km parcourus</Text>
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#41473E', paddingTop: 15 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600' }}>{runs.length}</Text>
              <Text style={{ color: '#C8CDC5', fontSize: 11 }}>Séances affichées</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600',
                fontVariant: ['tabular-nums'] }}>{formatDuration(duration)}</Text>
              <Text style={{ color: '#C8CDC5', fontSize: 11 }}>Temps total</Text>
            </View>
          </View>
        </View> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 9, paddingTop: 20, paddingBottom: 8 }}>
          {filters.map((item) => <Pressable key={item.key} accessibilityRole="button"
            accessibilityState={{ selected: filter === item.key }} onPress={() => setFilter(item.key)}
            style={{ paddingHorizontal: 19, minHeight: 41, borderRadius: 21, justifyContent: 'center',
              backgroundColor: filter === item.key ? black : '#F5F5F5' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === item.key ? '#FFFFFF' : black }}>{item.label}</Text>
          </Pressable>)}
        </ScrollView>
      </View>}
      renderSectionHeader={({ section }) => <View style={{ paddingHorizontal: 25, paddingTop: 23,
        paddingBottom: 13, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: black, fontSize: 18, fontWeight: '700', textTransform: 'capitalize' }}>{section.title}</Text>
        <Text style={{ color: muted, fontSize: 11 }}>{section.data.length} séance{section.data.length > 1 ? 's' : ''}</Text>
      </View>}
      ListEmptyComponent={<View style={{ padding: 35, alignItems: 'center', gap: 13, marginTop: 28 }}>
        {isPending ? <ActivityIndicator color={black} /> : <>
          <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#F5F5F5',
            justifyContent: 'center', alignItems: 'center' }}>
            <MaterialCommunityIcons name={isError ? 'cloud-alert-outline' : savedOnly ? 'star-outline' : 'run-fast'} size={32} color={black} />
          </View>
          <Text style={{ color: black, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
            {isError ? 'Séances indisponibles' : savedOnly ? 'Aucun favori ici' : 'Aucune séance ici'}</Text>
          <Text style={{ color: muted, fontSize: 14, lineHeight: 21, textAlign: 'center' }}>
            {isError ? 'Réessaie pour retrouver tes sorties.'
              : filter === 'all' ? savedOnly ? 'Appuie sur l’étoile d’une séance dans l’historique pour la retrouver ici.'
                : 'Ta première sortie apparaîtra ici une fois terminée.'
                : 'Aucune séance de ce type dans cette liste.'}</Text>
          {!hasNextPage || isError ? <Pressable accessibilityRole="button"
            onPress={() => isError ? void refresh()
              : filter !== 'all' ? setFilter('all') : savedOnly ? router.replace('/profile/history')
                : router.push('/(tabs)/run')}
            style={{ marginTop: 5, minHeight: 48, borderRadius: 24, backgroundColor: black,
              paddingHorizontal: 26, justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              {isError ? 'Réessayer' : filter !== 'all' ? 'Voir toutes les séances'
                : savedOnly ? 'Ouvrir l’historique' : 'Commencer une sortie'}</Text>
          </Pressable> : null}
        </>}
      </View>}
      ListFooterComponent={<View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
        {!savedOnly && history.isFetchNextPageError ? <Text style={{ color: muted, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
          Les séances suivantes n’ont pas pu être chargées.</Text> : null}
        {hasNextPage ? <Pressable accessibilityRole="button" disabled={history.isFetchingNextPage}
          onPress={() => void history.fetchNextPage()}
          style={{ minHeight: 50, borderRadius: 17, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
          {history.isFetchingNextPage ? <ActivityIndicator color={black} />
            : <Text style={{ color: black, fontSize: 14, fontWeight: '600' }}>Voir les séances précédentes</Text>}
        </Pressable> : null}
      </View>} />
  </SafeAreaView>;
}
