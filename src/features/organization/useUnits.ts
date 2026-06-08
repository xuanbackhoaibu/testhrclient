import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { sortByCode } from '../../shared/utils/sort';
import { sortPaginatedByCode } from '../../shared/utils/sortPaginated';
import { listAllUnits, listUnits, listUnitsSelect } from './unitsApi';

export function useUnits(params: ListQueryParams) {
  return useQuery({
    queryKey: ['units', params],
    queryFn: () => listUnits(params),
    select: sortPaginatedByCode,
  });
}

/**
 * Lấy toàn bộ đơn vị khớp bộ lọc (gộp mọi trang). Dùng khi cần sắp xếp /
 * phân trang ở client trên toàn danh sách (sắp theo mã đơn vị).
 */
export function useAllUnits(
  params: Omit<ListQueryParams, 'page' | 'pageSize'>,
) {
  return useQuery({
    queryKey: ['units', 'all', params],
    queryFn: () => listAllUnits(params),
  });
}

export function useUnitsSelect() {
  return useQuery({
    queryKey: ['units', 'select'],
    queryFn: listUnitsSelect,
    select: (data) => sortByCode(data),
  });
}
