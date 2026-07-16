import { useQuery } from '@tanstack/react-query';

import { getAccountAuthorizationDetail } from './accountAuthorizationService';

export function useAccountAuthorization(accountId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['account-authorization', accountId],
    queryFn: () => getAccountAuthorizationDetail(accountId!),
    enabled: Boolean(accountId) && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
