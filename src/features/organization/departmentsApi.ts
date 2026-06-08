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
import { mockDepartments } from '../../shared/mocks/mockOrganization';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type { Department, DepartmentSelectOption } from './organizationTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
type DepartmentPayload = Pick<Department, 'code' | 'unitId' | 'name' | 'status' | 'note'>;

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

/**
 * Lấy TOÀN BỘ phòng ban khớp bộ lọc (gộp mọi trang) để sắp xếp theo mã ở client.
 */
export async function listAllDepartments(
  params: Omit<ListQueryParams, 'page' | 'pageSize'> = {},
): Promise<Department[]> {
  if (isMockMode) {
    await mockDelay();
    return mockDepartments
      .filter((item) => (params.unitId ? item.unitId === params.unitId : true))
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.code, params.search) ||
          includesIgnoreCase(item.name, params.search) ||
          (!params.search && true),
      );
  }

  return fetchAllPages(listDepartments, params);
}

export async function listDepartmentsSelect(unitId?: string): Promise<DepartmentSelectOption[]> {
  if (isMockMode) {
    await mockDelay();
    return mockDepartments
      .filter((item) => item.status === 'ACTIVE')
      .filter((item) => (unitId ? item.unitId === unitId : true))
      .map((item) => ({
        id: item.id,
        code: item.code,
        unitId: item.unitId,
        name: item.name,
      }));
  }

  return api.get<DepartmentSelectOption[]>('/departments/select', {
    params: { unitId },
  });
}

export async function createDepartment(payload: DepartmentPayload): Promise<Department> {
  if (isMockMode) {
    await mockDelay();
    const department = { id: generateId('ou'), ...payload };
    mockDepartments.unshift(department);
    appendAuditLog({ entityType: 'DEPARTMENT', entityId: department.id, action: 'CREATE', afterJson: department as unknown as Record<string, unknown> });
    return department;
  }

  return api.post<Department>('/departments', payload);
}

export async function updateDepartment(id: string, payload: Partial<DepartmentPayload>): Promise<Department> {
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

  const url = `/departments/${id}`;
  debugApiRequest({
    action: 'department.update',
    method: 'PATCH',
    url: `${httpClient.defaults.baseURL ?? ''}${url}`,
    payload,
  });

  try {
    const response = await httpClient.patch(url, payload);
    const data = unwrapApiEnvelope<Department>(response.data);
    debugApiResponse({
      action: 'department.update',
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
      action: 'department.update',
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
