import { ApiError } from '../../shared/api/api.types';
import { api } from '../../shared/api/http-client';

const BASE = '/work-report-authorizations';

export type WorkReportAuthorizationLevel = 'DEPARTMENT' | 'COMPANY' | 'GROUP';
export type WorkReportAuthorizationScopeSource = 'PROFILE' | 'DELEGATION';
export type WorkReportAuthorizationStatus = 'DRAFT' | 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'INVALID';

export type WorkReportAuthorization = {
  id: string;
  authUserId: string;
  employeeId: string;
  employeeCode: string;
  displayName: string;
  level: WorkReportAuthorizationLevel;
  capabilities: Array<'AGGREGATE' | 'SUBMIT'>;
  scope: {
    companyId: string | null;
    companyCode: string | null;
    companyName: string | null;
    departmentId: string | null;
    departmentCode: string | null;
    departmentName: string | null;
    isGlobal: boolean;
  };
  scopeSource: WorkReportAuthorizationScopeSource;
  authorizationVersion: number;
  status: WorkReportAuthorizationStatus;
  effectiveFrom: string | null;
  expiresAt: string | null;
  reason: string | null;
  grantedBy: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkReportAuthorizationWrite = {
  authUserId: string;
  employeeId?: string;
  level: WorkReportAuthorizationLevel;
  scopeSource: WorkReportAuthorizationScopeSource;
  canAggregate: boolean;
  canSubmit: boolean;
  companyId?: string;
  departmentId?: string;
  isGlobal: boolean;
  reason?: string;
};

export async function getWorkReportAuthorization(authUserId: string): Promise<WorkReportAuthorization | null> {
  try {
    return await api.get<WorkReportAuthorization>(`${BASE}/${authUserId}`);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export function createWorkReportAuthorization(input: WorkReportAuthorizationWrite) {
  return api.post<WorkReportAuthorization>(BASE, input);
}

export function updateWorkReportAuthorization(
  authUserId: string,
  input: WorkReportAuthorizationWrite & { version: number },
) {
  return api.put<WorkReportAuthorization>(`${BASE}/${authUserId}`, input);
}

export function activateWorkReportAuthorization(authUserId: string, version: number, reason?: string) {
  return api.post<WorkReportAuthorization>(`${BASE}/${authUserId}/activate`, { version, reason });
}

export function revokeWorkReportAuthorization(authUserId: string, version: number, reason?: string) {
  return api.post<WorkReportAuthorization>(`${BASE}/${authUserId}/revoke`, { version, reason });
}

export function getWorkReportAuthorizationHistory(authUserId: string) {
  return api.get<Array<Record<string, unknown>>>(`${BASE}/${authUserId}/history`);
}
