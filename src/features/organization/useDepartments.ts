import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { sortByCode } from '../../shared/utils/sort';
import { sortPaginatedByCode } from '../../shared/utils/sortPaginated';
import { listAllDepartments, listDepartments, listDepartmentsSelect } from './departmentsApi';

export function useDepartments(params: ListQueryParams) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: () => listDepartments(params),
    select: sortPaginatedByCode,
  });
}

/**
 * Lấy toàn bộ phòng ban khớp bộ lọc (gộp mọi trang) để sắp xếp theo mã ở client.
 */
export function useAllDepartments(
  params: Omit<ListQueryParams, 'page' | 'pageSize'>,
) {
  return useQuery({
    queryKey: ['departments', 'all', params],
    queryFn: () => listAllDepartments(params),
  });
}

export function useDepartmentsSelect(unitId?: string) {
  return useQuery({
    queryKey: ['departments', 'select', unitId ?? null],
    queryFn: () => listDepartmentsSelect(unitId),
    select: (data) => sortByCode(data),
  });
}
