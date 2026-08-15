import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { deleteCancelledLeaveRequest, listLeaveRequests, listLeaveTypes } from './leaveApi';

export function useLeaveRequests(params: ListQueryParams) {
  return useQuery({
    queryKey: ['leave-requests', params],
    queryFn: () => listLeaveRequests(params),
  });
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: listLeaveTypes,
  });
}


export function useDeleteCancelledLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCancelledLeaveRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['employee-detail'] });
    },
  });
}
