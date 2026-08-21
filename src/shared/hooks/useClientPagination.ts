import { useMemo } from 'react';

import type { PaginationMeta } from '../types/api';

/**
 * Phân trang phía client cho các danh mục trả về TOÀN BỘ bản ghi khớp bộ lọc
 * trong một lần gọi (đơn vị, phòng ban, chức danh, ngành nghề, nhân sự).
 *
 * Cắt ở client để sắp xếp theo mã được đúng trên toàn danh sách — nếu để backend
 * cắt trang trước thì mỗi trang chỉ sắp được trong phạm vi trang đó.
 *
 * Kẹp `page` về `totalPages` để khi danh sách co lại (lọc, xoá bản ghi cuối)
 * trang đang xem không rơi ra ngoài và bảng không rỗng oan.
 *
 * Giới hạn: giữ cả danh sách trong bộ nhớ. Danh mục nào vượt vài nghìn dòng thì
 * chuyển sang phân trang + sắp xếp phía server thay vì dùng hook này.
 */
export function useClientPagination<T>(
  items: T[],
  page: number,
  pageSize: number,
): { pagedItems: T[]; pagedMeta: PaginationMeta } {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const pagedMeta = useMemo<PaginationMeta>(
    () => ({
      page: currentPage,
      pageSize,
      total: totalCount,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    }),
    [currentPage, pageSize, totalCount, totalPages],
  );

  return { pagedItems, pagedMeta };
}
