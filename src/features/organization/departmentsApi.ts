import { api } from '../../shared/api/httpClient';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockDepartments } from '../../shared/mocks/mockOrganization';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type { Department } from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
const DEPARTMENT_TREE_PAGE_SIZE = 100;

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

  const response = await api.get<PaginatedData<Department>>('/departments', { params });
  return normalizePaginatedResponse<Department>(response, params);
}

export async function getDepartmentTree(params: ListQueryParams = {}): Promise<DepartmentTreeNode[]> {
  const firstPage = await listDepartments({ ...params, page: 1, pageSize: DEPARTMENT_TREE_PAGE_SIZE });
  const remainingPages =
    firstPage.pagination.totalPages > 1
      ? await Promise.all(
          Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
            listDepartments({ ...params, page: index + 2, pageSize: DEPARTMENT_TREE_PAGE_SIZE }),
          ),
        )
      : [];
  const items = [firstPage, ...remainingPages].flatMap((page) => page.items);
  const map = new Map<string, DepartmentTreeNode>();
  items.forEach((item) => map.set(item.id, { ...item, children: [] }));

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

  return api.post<Department>('/departments', payload);
}

export async function updateDepartment(id: string, payload: Partial<Omit<Department, 'id'>>): Promise<Department> {
  if (isMockMode) {
    await mockDelay();
    const department = mockDepartments.find((item) => item.id === id);
    if (!department) {
      throw new Error('Department not found');
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

  return api.patch<Department>(`/departments/${id}`, payload);
}
