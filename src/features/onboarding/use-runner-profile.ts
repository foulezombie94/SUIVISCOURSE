import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { getRunnerProfile } from '@/services/runner-profile';

export function useRunnerProfile() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useQuery({
    queryKey: ['runner-profile', userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: () => getRunnerProfile(userId, session?.user.user_metadata?.runner_profile),
  });
}
