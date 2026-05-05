import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listPositions, listPositionsSelect } from './positionsApi';

export function usePositions(params: ListQueryParams) {
  return useQuery({
    queryKey: ['positions', params],
    queryFn: () => listPositions(params),
  });
}

export function usePositionsSelect() {
  return useQuery({
    queryKey: ['positions', 'select'],
    queryFn: listPositionsSelect,
  });
}
