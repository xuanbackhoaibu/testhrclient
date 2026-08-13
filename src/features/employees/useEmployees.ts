import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listAllEmployees, listEmployees } from './employeesApi';

export function useEmployees(params: ListQueryParams) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => listEmployees(params),
  });
}

interface UseAllEmployeesOptions {
  enabled?: boolean;
}

/**
 * Lấy toàn bộ nhân sự khớp bộ lọc (gộp mọi trang). Dùng khi cần sắp xếp /
 * phân trang ở client trên toàn danh sách (vd: sắp theo Mã chấm công).
 */
export function useAllEmployees(
  params: Omit<ListQueryParams, 'page' | 'pageSize'>,
  options: UseAllEmployeesOptions = {},
) {
  return useQuery({
    queryKey: ['employees', 'all', params],
    queryFn: () => listAllEmployees(params),
    enabled: options.enabled ?? true,
  });
}

