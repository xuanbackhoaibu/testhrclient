import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { getOrgUnitTree, listOrgUnits } from './orgUnitsApi';

export function useOrgUnits(params: ListQueryParams) {
  return useQuery({
    queryKey: ['org-units', params],
    queryFn: async () => {
      const [list, tree] = await Promise.all([listOrgUnits(params), getOrgUnitTree(params)]);
      return { ...list, tree };
    },
  });
}

