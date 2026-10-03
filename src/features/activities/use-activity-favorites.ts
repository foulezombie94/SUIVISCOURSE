import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { listActivityFavorites, toggleActivityFavorite } from '@/services/activity-favorites';
import type { Activity } from '@/types/domain';

export function useActivityFavorites() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const cache = useQueryClient();
  const queryKey = ['activity-favorites', userId];
  const query = useQuery({ queryKey, queryFn: () => listActivityFavorites(userId), enabled: !!userId });
  const mutation = useMutation({
    mutationFn: (activity: Activity) => toggleActivityFavorite(userId, activity),
    onSuccess: (activities) => cache.setQueryData(queryKey, activities),
    onError: () => Alert.alert('Favoris', 'La modification n’a pas pu être enregistrée. Réessaie.'),
  });
  return { query, mutation };
}
