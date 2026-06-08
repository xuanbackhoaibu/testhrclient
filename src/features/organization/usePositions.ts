import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { sortByCode } from '../../shared/utils/sort';
import { sortPaginatedByCode } from '../../shared/utils/sortPaginated';
import { listAllPositions, listPositions, listPositionsSelect } from './positionsApi';

export function usePositions(params: ListQueryParams) {
  return useQuery({
    queryKey: ['positions', params],
    queryFn: () => listPositions(params),
    select: sortPaginatedByCode,
  });
}

/**
 * Lấy toàn bộ vị trí khớp bộ lọc (gộp mọi trang) để sắp xếp theo mã ở client.
 */
export function useAllPositions(
  params: Omit<ListQueryParams, 'page' | 'pageSize'>,
) {
  return useQuery({
    queryKey: ['positions', 'all', params],
    queryFn: () => listAllPositions(params),
  });
}

export function usePositionsSelect() {
  return useQuery({
    queryKey: ['positions', 'select'],
    queryFn: listPositionsSelect,
    select: (data) => sortByCode(data),
  });
}
