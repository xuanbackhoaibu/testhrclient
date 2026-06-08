import type { ListQueryParams, PaginatedResponse } from '../types/api';

/**
 * Backend giới hạn pageSize tối đa 100. Helper này lấy trang đầu để biết tổng
 * số trang, rồi lấy các trang còn lại song song và gộp toàn bộ `items` lại.
 *
 * Dùng cho các màn cần sắp xếp / phân trang ở client trên TOÀN danh sách
 * (ví dụ: sắp theo mã chấm công, mã đơn vị, mã phòng ban...).
 *
 * @param fetchPage Hàm lấy một trang dữ liệu (vd: listUnits, listEmployees).
 * @param params    Bộ lọc (search, status...) — KHÔNG truyền page/pageSize.
 */
const MAX_PAGE_SIZE = 100;

export async function fetchAllPages<T>(
  fetchPage: (params: ListQueryParams) => Promise<PaginatedResponse<T>>,
  params: Omit<ListQueryParams, 'page' | 'pageSize'> = {},
): Promise<T[]> {
  const first = await fetchPage({ ...params, page: 1, pageSize: MAX_PAGE_SIZE });
  const totalPages = first.pagination?.totalPages ?? 1;

  if (totalPages <= 1) {
    return first.items;
  }

  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchPage({ ...params, page: index + 2, pageSize: MAX_PAGE_SIZE }),
    ),
  );

  return [first, ...restPages].flatMap((page) => page.items);
}
