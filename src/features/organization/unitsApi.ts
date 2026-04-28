import { api } from '../../shared/api/httpClient';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockUnits } from '../../shared/mocks/mockOrganization';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type { Unit } from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export async function listUnits(params: ListQueryParams = {}): Promise<PaginatedResponse<Unit>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockUnits.filter(
      (item) =>
        includesIgnoreCase(item.code, params.search) ||
        includesIgnoreCase(item.name, params.search) ||
        (!params.search && true),
    ).filter((item) => (params.status ? item.status === params.status : true));

    return paginate(filtered, params);
  }

  const response = await api.get<PaginatedData<Unit>>('/units', { params });
  return normalizePaginatedResponse<Unit>(response, params);
}

export async function createUnit(payload: Omit<Unit, 'id'>): Promise<Unit> {
  if (isMockMode) {
    await mockDelay();
    const entity = { id: generateId('le'), ...payload };
    mockUnits.unshift(entity);
    appendAuditLog({ entityType: 'UNIT', entityId: entity.id, action: 'CREATE', afterJson: entity as unknown as Record<string, unknown> });
    return entity;
  }

  return api.post<Unit>('/units', payload);
}

export async function updateUnit(id: string, payload: Partial<Omit<Unit, 'id'>>): Promise<Unit> {
  if (isMockMode) {
    await mockDelay();
    const entity = mockUnits.find((item) => item.id === id);
    if (!entity) {
      throw new Error('Legal entity not found');
    }

    const before = { ...entity };
    Object.assign(entity, payload);
    appendAuditLog({
      entityType: 'UNIT',
      entityId: id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: entity as unknown as Record<string, unknown>,
    });
    return entity;
  }

  return api.patch<Unit>(`/units/${id}`, payload);
}
