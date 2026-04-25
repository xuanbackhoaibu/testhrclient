import { httpClient } from '../../shared/api/httpClient';
import { paginate, includesIgnoreCase, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockAuditLogs } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { AuditLog } from './auditTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export async function listAuditLogs(params: ListQueryParams = {}): Promise<PaginatedResponse<AuditLog>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockAuditLogs
      .filter((item) => (params.entityType ? item.entityType === params.entityType : true))
      .filter((item) => (params.entityId ? item.entityId === params.entityId : true))
      .filter((item) => (params.action ? item.action === params.action : true))
      .filter((item) => (params.actorUserId ? item.actorUserId === params.actorUserId : true))
      .filter((item) => (params.fromDate ? item.createdAt >= params.fromDate : true))
      .filter((item) => (params.toDate ? item.createdAt <= params.toDate : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.entityType, params.search) ||
          includesIgnoreCase(item.actorName, params.search) ||
          includesIgnoreCase(item.entityId, params.search) ||
          (!params.search && true),
      );

    return paginate(filtered, params);
  }

  const response = await httpClient.get<PaginatedResponse<AuditLog>>('/audit-logs', { params });
  return response.data;
}

