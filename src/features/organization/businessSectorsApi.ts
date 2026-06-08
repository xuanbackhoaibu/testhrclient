import { api, httpClient, unwrapApiEnvelope } from '../../shared/api/httpClient';
import { ApiError } from '../../shared/api/api.types';
import { fetchAllPages } from '../../shared/api/fetchAllPages';
import {
  debugApiError,
  debugApiRequest,
  debugApiResponse,
} from '../../shared/debug/hrmDebug';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import {
  generateId,
  includesIgnoreCase,
  mockDelay,
  paginate,
} from '../../shared/mocks/mockHelpers';
import { mockBusinessSectors } from '../../shared/mocks/mockOrganization';
import type {
  ListQueryParams,
  PaginatedData,
  PaginatedResponse,
} from '../../shared/types/api';
import type {
  BusinessSector,
  BusinessSectorOption,
} from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export type BusinessSectorPayload = Pick<
  BusinessSector,
  'code' | 'name' | 'status' | 'note'
>;

export function normalizeBusinessSectorCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_-]/g, '');
}

export async function listBusinessSectors(
  params: ListQueryParams = {},
): Promise<PaginatedResponse<BusinessSector>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockBusinessSectors
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.code, params.search) ||
          includesIgnoreCase(item.name, params.search) ||
          includesIgnoreCase(item.note ?? '', params.search) ||
          (!params.search && true),
      );

    return paginate(filtered, params);
  }

  const response = await api.get<PaginatedData<BusinessSector>>(
    '/business-sectors',
    { params },
  );
  return normalizePaginatedResponse<BusinessSector>(response, params);
}

/**
 * Lấy TOÀN BỘ lĩnh vực khớp bộ lọc (gộp mọi trang) để sắp xếp theo mã ở client.
 */
export async function listAllBusinessSectors(
  params: Omit<ListQueryParams, 'page' | 'pageSize'> = {},
): Promise<BusinessSector[]> {
  if (isMockMode) {
    await mockDelay();
    return mockBusinessSectors
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.code, params.search) ||
          includesIgnoreCase(item.name, params.search) ||
          includesIgnoreCase(item.note ?? '', params.search) ||
          (!params.search && true),
      );
  }

  return fetchAllPages(listBusinessSectors, params);
}

export async function listBusinessSectorsOptions(): Promise<
  BusinessSectorOption[]
> {
  if (isMockMode) {
    await mockDelay();
    return mockBusinessSectors
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
      }));
  }

  return api.get<BusinessSectorOption[]>('/business-sectors/options');
}

export async function createBusinessSector(
  payload: BusinessSectorPayload,
): Promise<BusinessSector> {
  if (isMockMode) {
    await mockDelay();
    const entity: BusinessSector = {
      id: generateId('sector'),
      ...payload,
      code: normalizeBusinessSectorCode(payload.code),
      note: payload.note ?? null,
    };
    mockBusinessSectors.unshift(entity);
    appendAuditLog({
      entityType: 'BUSINESS_SECTOR',
      entityId: entity.id,
      action: 'CREATE',
      afterJson: entity as unknown as Record<string, unknown>,
    });
    return entity;
  }

  return api.post<BusinessSector>('/business-sectors', payload);
}

export async function updateBusinessSector(
  id: string,
  payload: Partial<BusinessSectorPayload>,
): Promise<BusinessSector> {
  if (isMockMode) {
    await mockDelay();
    const entity = mockBusinessSectors.find((item) => item.id === id);
    if (!entity) {
      throw new Error('Business sector not found');
    }

    const before = { ...entity };
    Object.assign(entity, payload);
    if (payload.code) {
      entity.code = normalizeBusinessSectorCode(payload.code);
    }
    appendAuditLog({
      entityType: 'BUSINESS_SECTOR',
      entityId: id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: entity as unknown as Record<string, unknown>,
    });
    return entity;
  }

  const url = `/business-sectors/${id}`;
  debugApiRequest({
    action: 'business-sector.update',
    method: 'PATCH',
    url: `${httpClient.defaults.baseURL ?? ''}${url}`,
    payload,
  });

  try {
    const response = await httpClient.patch(url, payload);
    const data = unwrapApiEnvelope<BusinessSector>(response.data);
    debugApiResponse({
      action: 'business-sector.update',
      method: 'PATCH',
      url: `${httpClient.defaults.baseURL ?? ''}${url}`,
      payload,
      status: response.status,
      requestId: response.headers['x-request-id'] as string | undefined,
    });
    return data;
  } catch (error) {
    const apiError = error instanceof ApiError ? error : undefined;
    debugApiError({
      action: 'business-sector.update',
      method: 'PATCH',
      url: `${httpClient.defaults.baseURL ?? ''}${url}`,
      payload,
      status: apiError?.statusCode,
      requestId: apiError?.requestId,
      responseBody: apiError,
    });
    throw error;
  }
}

export async function deactivateBusinessSector(
  id: string,
): Promise<BusinessSector> {
  if (isMockMode) {
    await mockDelay();
    const entity = mockBusinessSectors.find((item) => item.id === id);
    if (!entity) {
      throw new Error('Business sector not found');
    }

    const before = { ...entity };
    entity.status = 'INACTIVE';
    appendAuditLog({
      entityType: 'BUSINESS_SECTOR',
      entityId: id,
      action: 'INACTIVE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: entity as unknown as Record<string, unknown>,
    });
    return entity;
  }

  return api.delete<BusinessSector>(`/business-sectors/${id}`);
}
