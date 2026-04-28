import type { ListQueryParams, PaginatedResponse } from '../types/api';

export async function mockDelay(ms = 120): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function paginate<T>(items: T[], params: ListQueryParams = {}): PaginatedResponse<T> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pagination = {
    page,
    pageSize,
    total: items.length,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  return {
    items: data,
    pagination,
    data,
    meta: pagination,
  };
}

export function includesIgnoreCase(value: string | undefined, keyword: string | undefined): boolean {
  if (!keyword) {
    return true;
  }

  return (value ?? '').toLowerCase().includes(keyword.toLowerCase());
}

export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
