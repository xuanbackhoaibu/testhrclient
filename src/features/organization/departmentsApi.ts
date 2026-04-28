import { httpClient } from '../../shared/api/httpClient';
import { normalizePaginatedResponse, unwrapApiResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockDepartments } from '../../shared/mocks/mockOrganization';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { Department } from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export interface DepartmentTreeNode extends Department {
  children?: DepartmentTreeNode[];
}

export async function listDepartments(params: ListQueryParams = {}): Promise<PaginatedResponse<Department>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockDepartments
      .filter((item) => (params.unitId ? item.unitId === params.unitId : true))
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.code, params.search) ||
          includesIgnoreCase(item.name, params.search) ||
          (!params.search && true),
      );

    return paginate(filtered, params);
  }

  const response = await httpClient.get('/departments', { params });
  return normalizePaginatedResponse<Department>(response.data, params);
}

export async function getDepartmentTree(params: ListQueryParams = {}): Promise<DepartmentTreeNode[]> {
  const { data } = await listDepartments({ ...params, page: 1, pageSize: 200 });
  const map = new Map<string, DepartmentTreeNode>();
  data.forEach((item) => map.set(item.id, { ...item, children: [] }));

  const roots: DepartmentTreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children?.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export async function createDepartment(payload: Omit<Department, 'id'>): Promise<Department> {
  if (isMockMode) {
    await mockDelay();
    const department = { id: generateId('ou'), ...payload };
    mockDepartments.unshift(department);
    appendAuditLog({ entityType: 'DEPARTMENT', entityId: department.id, action: 'CREATE', afterJson: department as unknown as Record<string, unknown> });
    return department;
  }

  const response = await httpClient.post('/departments', payload);
  return unwrapApiResponse<Department>(response.data);
}

export async function updateDepartment(id: string, payload: Partial<Omit<Department, 'id'>>): Promise<Department> {
  if (isMockMode) {
    await mockDelay();
    const department = mockDepartments.find((item) => item.id === id);
    if (!department) {
      throw new Error('Org unit not found');
    }

    const before = { ...department };
    Object.assign(department, payload);
    appendAuditLog({
      entityType: 'DEPARTMENT',
      entityId: id,
      action: 'UPDATE',
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: department as unknown as Record<string, unknown>,
    });
    return department;
  }

  const response = await httpClient.patch(`/departments/${id}`, payload);
  return unwrapApiResponse<Department>(response.data);
}
