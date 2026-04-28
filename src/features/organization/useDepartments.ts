import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { getDepartmentTree, listDepartments, listDepartmentsSelect } from './departmentsApi';

export function useDepartments(params: ListQueryParams) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: async () => {
      const [list, tree] = await Promise.all([listDepartments(params), getDepartmentTree(params)]);
      return { ...list, tree };
    },
  });
}

export function useDepartmentsSelect(unitId?: string) {
  return useQuery({
    queryKey: ['departments', 'select', unitId ?? null],
    queryFn: () => listDepartmentsSelect(unitId),
  });
}
