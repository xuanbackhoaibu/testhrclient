import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listPositions } from './positionsApi';

export function usePositions(params: ListQueryParams) {
  return useQuery({
    queryKey: ['positions', params],
    queryFn: () => listPositions(params),
  });
}

