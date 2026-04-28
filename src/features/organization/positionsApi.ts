import { api } from '../../shared/api/httpClient';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockPositions } from '../../shared/mocks/mockOrganization';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type { Position } from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

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

export async function createPosition(payload: Omit<Position, 'id'>): Promise<Position> {
  if (isMockMode) {
    await mockDelay();
    const position = { id: generateId('pos'), ...payload };
    mockPositions.unshift(position);
    appendAuditLog({ entityType: 'POSITION', entityId: position.id, action: 'CREATE', afterJson: position as unknown as Record<string, unknown> });
    return position;
  }

  return api.post<Position>('/positions', payload);
}

export async function updatePosition(id: string, payload: Partial<Omit<Position, 'id'>>): Promise<Position> {
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

  return api.patch<Position>(`/positions/${id}`, payload);
}
