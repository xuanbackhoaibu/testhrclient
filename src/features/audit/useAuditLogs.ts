import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listAuditLogs } from './auditApi';

export function useAuditLogs(params: ListQueryParams) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => listAuditLogs(params),
  });
}
