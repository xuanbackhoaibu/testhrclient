import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listContracts } from './contractsApi';

export function useContracts(params: ListQueryParams) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: () => listContracts(params),
  });
}

