import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { loadProgramme, updateProgramme, type ProgrammeAction } from './programme-state';

export function useProgramme() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const cache = useQueryClient();
  const queryKey = ['running-programme', userId];
  const query = useQuery({ queryKey, enabled: !!userId, queryFn: () => loadProgramme(userId) });
  const mutation = useMutation({ mutationFn: (action: ProgrammeAction) => updateProgramme(userId, action),
    onSuccess: (state) => cache.setQueryData(queryKey, state),
    onError: () => Alert.alert('Programme', 'La modification n’a pas pu être enregistrée. Réessaie.') });
  return { query, mutation };
}
