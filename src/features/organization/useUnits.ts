import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listUnits, listUnitsSelect } from './unitsApi';

export function useUnits(params: ListQueryParams) {
  return useQuery({
    queryKey: ['units', params],
    queryFn: () => listUnits(params),
  });
}

export function useUnitsSelect() {
  return useQuery({
    queryKey: ['units', 'select'],
    queryFn: listUnitsSelect,
  });
}
