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
