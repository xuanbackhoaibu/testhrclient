import type { AuditLog } from '../../features/audit/auditTypes';
import { useAuthStore } from '../../features/auth/authStore';
import { generateId } from './mockHelpers';
import { mockAuditLogs } from './mockWorkflows';

export function appendAuditLog(payload: {
  entityType: string;
  entityId: string;
  action: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
}): AuditLog {
  const user = useAuthStore.getState().user;

  const auditLog: AuditLog = {
    id: generateId('adt'),
    entityType: payload.entityType,
    entityId: payload.entityId,
    action: payload.action,
    actorUserId: user?.id ?? 'system',
    actorName: user?.fullName ?? 'System',
    beforeJson: payload.beforeJson ?? null,
    afterJson: payload.afterJson ?? null,
    createdAt: new Date().toISOString(),
  };

  mockAuditLogs.unshift(auditLog);
  return auditLog;
}

