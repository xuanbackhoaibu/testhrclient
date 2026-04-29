import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listDepartments, listDepartmentsSelect } from './departmentsApi';

export function useDepartments(params: ListQueryParams) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: () => listDepartments(params),
  });
}

export function useDepartmentsSelect(unitId?: string) {
  return useQuery({
    queryKey: ['departments', 'select', unitId ?? null],
    queryFn: () => listDepartmentsSelect(unitId),
  });
}
