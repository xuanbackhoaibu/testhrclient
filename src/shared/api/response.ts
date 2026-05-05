import type {
  ListQueryParams,
  PaginatedData,
  PaginatedResponse,
  PaginationMeta,
} from '../types/api';
import { unwrapApiEnvelope } from './http-client';

type BackendPaginatedResponse<T> =
  | PaginatedData<T>
  | {
      data?: T[];
      meta?: Partial<PaginationMeta>;
      pagination?: Partial<PaginationMeta>;
    };

function fallbackPagination(params: ListQueryParams = {}, total = 0): PaginationMeta {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? Math.max(total, 10);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function completePagination(
  pagination: Partial<PaginationMeta> | undefined,
  params: ListQueryParams,
  total: number,
): PaginationMeta {
  const fallback = fallbackPagination(params, total);
  const page = pagination?.page ?? fallback.page;
  const pageSize = pagination?.pageSize ?? fallback.pageSize;
  const resolvedTotal = pagination?.total ?? fallback.total;
  const totalPages =
    pagination?.totalPages ??
    (resolvedTotal === 0 ? 0 : Math.ceil(resolvedTotal / pageSize));

  return {
    page,
    pageSize,
    total: resolvedTotal,
    totalPages,
    hasNextPage: pagination?.hasNextPage ?? page < totalPages,
    hasPreviousPage: pagination?.hasPreviousPage ?? page > 1,
  };
}

export function normalizePaginatedResponse<T>(
  payload: BackendPaginatedResponse<T> | T[] | null | undefined,
  params: ListQueryParams = {},
): PaginatedResponse<T> {
  if (Array.isArray(payload)) {
    const pagination = fallbackPagination(params, payload.length);
    return { items: payload, pagination, data: payload, meta: pagination };
  }

  const items = Array.isArray((payload as PaginatedData<T> | undefined)?.items)
    ? (payload as PaginatedData<T>).items
    : Array.isArray((payload as { data?: T[] } | undefined)?.data)
      ? ((payload as { data?: T[] }).data ?? [])
      : [];
  const rawPagination =
    (payload as PaginatedData<T> | undefined)?.pagination ??
    (payload as { meta?: Partial<PaginationMeta> } | undefined)?.meta;
  const pagination = completePagination(rawPagination, params, items.length);

  return {
    items,
    pagination,
    data: items,
    meta: pagination,
  };
}

export const unwrapApiResponse = unwrapApiEnvelope;
