import { api, httpClient, unwrapApiEnvelope } from '../../shared/api/httpClient';
import { ApiError } from '../../shared/api/api.types';
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
type PositionPayload = Omit<Position, 'id'>;

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
    const position = { id: generateId('pos'), ...payload };
    mockPositions.unshift(position);
    appendAuditLog({ entityType: 'POSITION', entityId: position.id, action: 'CREATE', afterJson: position as unknown as Record<string, unknown> });
    return position;
  }

  return api.post<Position>('/positions', payload);
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
