import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listImportBatches } from './importsApi';

export function useImportBatches(params: ListQueryParams, enabled = true) {
  return useQuery({
    queryKey: ['import-batches', params],
    queryFn: () => listImportBatches(params),
    enabled,
  });
}
