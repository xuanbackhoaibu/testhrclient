import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listUnits } from './unitsApi';

export function useUnits(params: ListQueryParams) {
  return useQuery({
    queryKey: ['units', params],
    queryFn: () => listUnits(params),
  });
}

