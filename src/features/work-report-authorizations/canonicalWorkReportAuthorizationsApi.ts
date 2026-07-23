import { api } from '../../shared/api/http-client';

const BASE = '/work-report-authorizations';

export type AssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'REVOKED';
export type Assignment = {
  id: string; authUserId: string; employeeId: string; roleKey: string; actions: string[];
  effect: 'ALLOW' | 'DENY'; scopeType: string; scopeId: string; reportingTargetType: string;
  reportingTargetId: string; sourceType: string; sourceReferenceId: string | null;
  status: AssignmentStatus; assignmentVersion: number; authorizationVersion: number;
  createdAt: string; updatedAt: string;
};

export type AssignmentWrite = Pick<Assignment, 'authUserId' | 'employeeId' | 'roleKey' | 'actions' | 'effect' | 'scopeType' | 'scopeId' | 'reportingTargetType' | 'reportingTargetId' | 'sourceType'> & { sourceReferenceId?: string; reason?: string };
export type AssignmentList = { items: Assignment[]; page: number; pageSize: number; total: number; hasNext: boolean };

export function listAssignments(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return api.get<AssignmentList>(`${BASE}?${query.toString()}`);
}
export const getAssignment = (id: string) => api.get<{ assignment: Assignment }>(`${BASE}/${id}`);
export const createAssignment = (input: AssignmentWrite) => api.post<Assignment>(BASE, input);
export const updateAssignment = (id: string, input: Partial<AssignmentWrite> & { expectedAssignmentVersion: number }) => api.patch<Assignment>(`${BASE}/${id}`, input);
export const activateAssignment = (id: string, assignmentVersion: number) => api.post<Assignment>(`${BASE}/${id}/activate`, { assignmentVersion });
export const deactivateAssignment = (id: string, assignmentVersion: number) => api.post<Assignment>(`${BASE}/${id}/deactivate`, { assignmentVersion });
export const revokeAssignment = (id: string, assignmentVersion: number, reason: string) => api.post<Assignment>(`${BASE}/${id}/revoke`, { assignmentVersion, reason });
export const listAssignmentAudit = (id: string) => api.get<{ items: Array<Record<string, unknown>> }>(`${BASE}/${id}/audit`);

export type BusinessPermission = { type: 'DEPARTMENT_REPORT'; departmentIds: string[] } | { type: 'UNIT_REPORT'; unitIds: string[] } | { type: 'CORPORATE_REPORT' };
export type MatrixRow = {
  employeeId: string; authUserId: string | null; employeeCode: string; fullName: string; email: string | null;
  departmentId: string | null; departmentName: string | null; unitId: string | null; unitName: string | null;
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'UNLINKED'; permissions: BusinessPermission[]; assignmentCount: number; updatedAt: string | null;
};
export type MatrixResult = { items: MatrixRow[]; page: number; pageSize: number; total: number; hasNext: boolean };
export type BusinessOption = { id: string; code?: string | null; label: string };
export type BusinessGrant = { employeeId: string; permissions: BusinessPermission[]; reason?: string };

export function listMatrix(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return api.get<MatrixResult>(`${BASE}/matrix?${query.toString()}`);
}
export const listBusinessEmployees = (search?: string) => api.get<BusinessOption[]>(`${BASE}/options/employees${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const listBusinessDepartments = (search?: string) => api.get<BusinessOption[]>(`${BASE}/options/departments${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const listBusinessUnits = (search?: string) => api.get<BusinessOption[]>(`${BASE}/options/units${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const getCorporation = () => api.get<BusinessOption & { rootUnitId: string }>(`${BASE}/options/corporation`);
export const previewBusinessGrant = (input: BusinessGrant) => api.post<unknown>(`${BASE}/business/preview`, input);
export const createBusinessGrant = (input: BusinessGrant) => api.post<{ assignments: Assignment[] }>(`${BASE}/business/grants`, input);
export const previewBusinessBatch = (input: { employeeIds: string[]; permissions: BusinessPermission[] }) => api.post<{ totalSubjects: number; eligibleSubjects: number; skippedSubjects: number; assignmentCount: number }>(`${BASE}/business/batch/preview`, input);
export const applyBusinessBatch = (input: { employeeIds: string[]; permissions: BusinessPermission[]; idempotencyKey: string; mergeMode?: 'ADD_MISSING' | 'REPLACE_MANAGED_PERMISSIONS'; confirmReplaceManagedPermissions?: boolean }) => api.post<{ id: string; status: string }>(`${BASE}/business/batch/apply`, input);
export const getBusinessOperation = (id: string) => api.get<{ id: string; status: string; totalSubjects: number; processedSubjects: number; succeededSubjects: number; failedSubjects: number; results: Array<Record<string, unknown>> }>(`${BASE}/business/operations/${id}`);
