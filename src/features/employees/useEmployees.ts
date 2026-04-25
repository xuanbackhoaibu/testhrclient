import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listEmployees } from './employeesApi';

export function useEmployees(params: ListQueryParams) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => listEmployees(params),
  });
}

