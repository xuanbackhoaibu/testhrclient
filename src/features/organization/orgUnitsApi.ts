import { httpClient } from '../../shared/api/httpClient';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockOrgUnits } from '../../shared/mocks/mockOrganization';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { OrgUnit } from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export interface OrgUnitTreeNode extends OrgUnit {
  children?: OrgUnitTreeNode[];
}

export async function listOrgUnits(params: ListQueryParams = {}): Promise<PaginatedResponse<OrgUnit>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockOrgUnits
      .filter((item) => (params.legalEntityId ? item.legalEntityId === params.legalEntityId : true))
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.code, params.search) ||
          includesIgnoreCase(item.name, params.search) ||
          (!params.search && true),
      );

    return paginate(filtered, params);
  }

  const response = await httpClient.get<PaginatedResponse<OrgUnit>>('/organization/org-units', { params });
  return response.data;
}

export async function getOrgUnitTree(params: ListQueryParams = {}): Promise<OrgUnitTreeNode[]> {
  const { data } = await listOrgUnits({ ...params, page: 1, pageSize: 200 });
  const map = new Map<string, OrgUnitTreeNode>();
  data.forEach((item) => map.set(item.id, { ...item, children: [] }));

  const roots: OrgUnitTreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children?.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export async function createOrgUnit(payload: Omit<OrgUnit, 'id'>): Promise<OrgUnit> {
  if (isMockMode) {
    await mockDelay();
    const orgUnit = { id: generateId('ou'), ...payload };
    mockOrgUnits.unshift(orgUnit);
    appendAuditLog({ entityType: 'ORG_UNIT', entityId: orgUnit.id, action: 'CREATE', afterJson: orgUnit as unknown as Record<string, unknown> });
    return orgUnit;
  }

  const response = await httpClient.post<OrgUnit>('/organization/org-units', payload);
  return response.data;
}

export async function updateOrgUnit(id: string, payload: Partial<Omit<OrgUnit, 'id'>>): Promise<OrgUnit> {
  if (isMockMode) {
    await mockDelay();
    const orgUnit = mockOrgUnits.find((item) => item.id === id);
    if (!orgUnit) {
      throw new Error('Org unit not found');
    }

    const before = { ...orgUnit };
    Object.assign(orgUnit, payload);
    appendAuditLog({
      entityType: 'ORG_UNIT',
      entityId: id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: orgUnit as unknown as Record<string, unknown>,
    });
    return orgUnit;
  }

  const response = await httpClient.patch<OrgUnit>(`/organization/org-units/${id}`, payload);
  return response.data;
}

