import type { PaginatedResponse } from '../types/api';
import { sortByCode } from './sort';

/**
 * Sắp xếp một trang dữ liệu (PaginatedResponse) theo mã tăng dần.
 *
 * Giữ nguyên thông tin phân trang, chỉ sắp lại danh sách phần tử.
 * Sắp cả `items` (mới) lẫn `data` (alias cũ) để mọi nơi đọc đều thống nhất.
 *
 * Lưu ý: chỉ sắp các phần tử trong trang hiện tại; việc sắp toàn bộ
 * nhiều trang cần backend hỗ trợ tham số sort.
 */
export function sortPaginatedByCode<T extends { code?: string | number }>(
  response: PaginatedResponse<T>,
): PaginatedResponse<T> {
  const sorted = sortByCode(response.items ?? response.data);
  return {
    ...response,
    items: sorted,
    data: sorted,
  };
}
