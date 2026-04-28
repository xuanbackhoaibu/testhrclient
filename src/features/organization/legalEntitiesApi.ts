import { httpClient } from '../../shared/api/httpClient';
import { normalizePaginatedResponse, unwrapApiResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockLegalEntities } from '../../shared/mocks/mockOrganization';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { LegalEntity } from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export async function listLegalEntities(params: ListQueryParams = {}): Promise<PaginatedResponse<LegalEntity>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockLegalEntities.filter(
      (item) =>
        includesIgnoreCase(item.code, params.search) ||
        includesIgnoreCase(item.name, params.search) ||
        (!params.search && true),
    ).filter((item) => (params.status ? item.status === params.status : true));

    return paginate(filtered, params);
  }

  const response = await httpClient.get('/legal-entities', { params });
  return normalizePaginatedResponse<LegalEntity>(response.data, params);
}

export async function createLegalEntity(payload: Omit<LegalEntity, 'id'>): Promise<LegalEntity> {
  if (isMockMode) {
    await mockDelay();
    const entity = { id: generateId('le'), ...payload };
    mockLegalEntities.unshift(entity);
    appendAuditLog({ entityType: 'LEGAL_ENTITY', entityId: entity.id, action: 'CREATE', afterJson: entity as unknown as Record<string, unknown> });
    return entity;
  }

  const response = await httpClient.post('/legal-entities', payload);
  return unwrapApiResponse<LegalEntity>(response.data);
}

export async function updateLegalEntity(id: string, payload: Partial<Omit<LegalEntity, 'id'>>): Promise<LegalEntity> {
  if (isMockMode) {
    await mockDelay();
    const entity = mockLegalEntities.find((item) => item.id === id);
    if (!entity) {
      throw new Error('Legal entity not found');
    }

    const before = { ...entity };
    Object.assign(entity, payload);
    appendAuditLog({
      entityType: 'LEGAL_ENTITY',
      entityId: id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: entity as unknown as Record<string, unknown>,
    });
    return entity;
  }

  const response = await httpClient.patch(`/legal-entities/${id}`, payload);
  return unwrapApiResponse<LegalEntity>(response.data);
}
