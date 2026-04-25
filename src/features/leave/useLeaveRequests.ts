import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listLeaveRequests } from './leaveApi';

export function useLeaveRequests(params: ListQueryParams) {
  return useQuery({
    queryKey: ['leave-requests', params],
    queryFn: () => listLeaveRequests(params),
  });
}

