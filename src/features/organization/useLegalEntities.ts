import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listLegalEntities } from './legalEntitiesApi';

export function useLegalEntities(params: ListQueryParams) {
  return useQuery({
    queryKey: ['legal-entities', params],
    queryFn: () => listLegalEntities(params),
  });
}

