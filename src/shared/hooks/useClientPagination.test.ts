// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useClientPagination } from './useClientPagination';

const items = Array.from({ length: 25 }, (_, i) => i + 1);

describe('useClientPagination', () => {
  it('cắt đúng lát của trang hiện tại', () => {
    const { result } = renderHook(() => useClientPagination(items, 2, 10));
    expect(result.current.pagedItems).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(result.current.pagedMeta).toEqual({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('kẹp trang vượt quá về trang cuối thay vì trả mảng rỗng', () => {
    const { result } = renderHook(() => useClientPagination(items, 9, 10));
    expect(result.current.pagedItems).toEqual([21, 22, 23, 24, 25]);
    expect(result.current.pagedMeta.page).toBe(3);
    expect(result.current.pagedMeta.hasNextPage).toBe(false);
  });

  it('danh sách rỗng vẫn còn 1 trang, không chia cho 0', () => {
    const { result } = renderHook(() => useClientPagination([], 1, 10));
    expect(result.current.pagedItems).toEqual([]);
    expect(result.current.pagedMeta.totalPages).toBe(1);
    expect(result.current.pagedMeta.hasPreviousPage).toBe(false);
  });
});
