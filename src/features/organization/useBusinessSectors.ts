import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { sortByCode } from '../../shared/utils/sort';
import { sortPaginatedByCode } from '../../shared/utils/sortPaginated';
import {
  listAllBusinessSectors,
  listBusinessSectors,
  listBusinessSectorsOptions,
} from './businessSectorsApi';

export function useBusinessSectors(params: ListQueryParams) {
  return useQuery({
    queryKey: ['business-sectors', params],
    queryFn: () => listBusinessSectors(params),
    select: sortPaginatedByCode,
  });
}

/**
 * Lấy toàn bộ lĩnh vực khớp bộ lọc (gộp mọi trang) để sắp xếp theo mã ở client.
 */
export function useAllBusinessSectors(
  params: Omit<ListQueryParams, 'page' | 'pageSize'>,
) {
  return useQuery({
    queryKey: ['business-sectors', 'all', params],
    queryFn: () => listAllBusinessSectors(params),
  });
}

export function useBusinessSectorsOptions() {
  return useQuery({
    queryKey: ['business-sectors', 'options'],
    queryFn: listBusinessSectorsOptions,
    select: (data) => sortByCode(data),
  });
}

export function useBusinessSectorsSelect() {
  return useBusinessSectorsOptions();
}
