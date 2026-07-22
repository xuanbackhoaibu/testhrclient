import { api, httpClient, unwrapApiEnvelope } from '../../shared/api/httpClient';
import { ApiError } from '../../shared/api/api.types';
import { fetchAllPages } from '../../shared/api/fetchAllPages';
import { normalizePaginatedResponse } from '../../shared/api/response';
import {
  debugApiError,
  debugApiRequest,
  debugApiResponse,
} from '../../shared/debug/hrmDebug';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockPositions } from '../../shared/mocks/mockOrganization';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type { Position, PositionSelectOption } from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
// `code` không còn nhập từ UI — backend tự sinh từ tên chức danh.
type PositionPayload = Omit<Position, 'id' | 'code'> & { code?: string };

export async function listPositions(params: ListQueryParams = {}): Promise<PaginatedResponse<Position>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockPositions
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.code, params.search) ||
          includesIgnoreCase(item.name, params.search) ||
          includesIgnoreCase(item.jobFunction, params.search) ||
          (!params.search && true),
      );

    return paginate(filtered, params);
  }

  const response = await api.get<PaginatedData<Position>>('/positions', { params });
  return normalizePaginatedResponse<Position>(response, params);
}

/**
 * Lấy TOÀN BỘ vị trí khớp bộ lọc (gộp mọi trang) để sắp xếp theo mã ở client.
 */
export async function listAllPositions(
  params: Omit<ListQueryParams, 'page' | 'pageSize'> = {},
): Promise<Position[]> {
  if (isMockMode) {
    await mockDelay();
    return mockPositions
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.code, params.search) ||
          includesIgnoreCase(item.name, params.search) ||
          includesIgnoreCase(item.jobFunction, params.search) ||
          (!params.search && true),
      );
  }

  return fetchAllPages(listPositions, params);
}

export async function listPositionsSelect(): Promise<PositionSelectOption[]> {
  if (isMockMode) {
    await mockDelay();
    return mockPositions
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        jobFunction: item.jobFunction,
        grade: item.grade,
      }));
  }

  return api.get<PositionSelectOption[]>('/positions/select');
}

export async function createPosition(payload: PositionPayload): Promise<Position> {
  if (isMockMode) {
    await mockDelay();
    // Mock mode tự sinh mã giống backend để giữ nguyên hình dạng Position.
    const position: Position = {
      ...payload,
      code: payload.code ?? generateId('POS').toUpperCase(),
      id: generateId('pos'),
    };
    mockPositions.unshift(position);
    appendAuditLog({ entityType: 'POSITION', entityId: position.id, action: 'CREATE', afterJson: position as unknown as Record<string, unknown> });
    return position;
  }

  return api.post<Position>('/positions', payload);
}

/**
 * Xóa chức danh. Backend xử lý mềm: chuyển trạng thái sang INACTIVE và ghi
 * audit log, không xóa hẳn bản ghi (nhân sự đang gắn vẫn giữ được lịch sử).
 */
export async function deletePosition(id: string): Promise<Position> {
  if (isMockMode) {
    await mockDelay();
    const position = mockPositions.find((item) => item.id === id);
    if (!position) {
      throw new Error('Position not found');
    }

    const before = { ...position };
    position.status = 'INACTIVE';
    appendAuditLog({
      entityType: 'POSITION',
      entityId: id,
      action: 'INACTIVE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: position as unknown as Record<string, unknown>,
    });
    return position;
  }

  return api.delete<Position>(`/positions/${id}`);
}

export async function updatePosition(id: string, payload: Partial<PositionPayload>): Promise<Position> {
  if (isMockMode) {
    await mockDelay();
    const position = mockPositions.find((item) => item.id === id);
    if (!position) {
      throw new Error('Position not found');
    }

    const before = { ...position };
    Object.assign(position, payload);
    appendAuditLog({
      entityType: 'POSITION',
      entityId: id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: position as unknown as Record<string, unknown>,
    });
    return position;
  }

  const url = `/positions/${id}`;
  debugApiRequest({
    action: 'position.update',
    method: 'PATCH',
    url: `${httpClient.defaults.baseURL ?? ''}${url}`,
    payload,
  });

  try {
    const response = await httpClient.patch(url, payload);
    const data = unwrapApiEnvelope<Position>(response.data);
    debugApiResponse({
      action: 'position.update',
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
      action: 'position.update',
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
