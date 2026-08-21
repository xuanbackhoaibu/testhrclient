import { useMemo } from 'react';

import type { PaginationMeta } from '../types/api';

/**
 * Phân trang phía client cho các endpoint trả về toàn bộ bản ghi khớp bộ lọc.
 *
 * Kẹp `page` vào khoảng hợp lệ nên khi danh sách co lại (lọc, xoá) trang hiện
 * tại không rơi ra ngoài và bảng không bị rỗng oan.
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
