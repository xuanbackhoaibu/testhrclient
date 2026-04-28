import type { ApiResponse, ListQueryParams, PaginatedResponse, PaginationMeta } from '../types/api';

type BackendPaginatedResponse<T> = {
  data?: T[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
};

function fallbackPagination(params: ListQueryParams = {}, total = 0): PaginationMeta {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? Math.max(total, 10);

  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function normalizePaginatedResponse<T>(
  payload: BackendPaginatedResponse<T> | T[] | null | undefined,
  params: ListQueryParams = {},
): PaginatedResponse<T> {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      meta: fallbackPagination(params, payload.length),
    };
  }

  const data = Array.isArray(payload?.data) ? payload.data : [];

  return {
    data,
    meta: payload?.meta ?? payload?.pagination ?? fallbackPagination(params, data.length),
  };
}

export function unwrapApiResponse<T>(payload: ApiResponse<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
}
