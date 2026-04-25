import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listMovements } from './movementsApi';

export function useMovements(params: ListQueryParams) {
  return useQuery({
    queryKey: ['movements', params],
    queryFn: () => listMovements(params),
  });
}

