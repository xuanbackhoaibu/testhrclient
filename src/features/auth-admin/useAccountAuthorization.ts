import { useQuery } from '@tanstack/react-query';

import { getAccountAuthorizationDetail } from './accountAuthorizationService';

export function useAccountAuthorization(accountId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['account-authorization', accountId],
    queryFn: () => getAccountAuthorizationDetail(accountId!),
    enabled: Boolean(accountId) && enabled,
  });
}
