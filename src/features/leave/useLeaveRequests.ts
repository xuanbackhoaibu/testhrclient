import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { createLeaveType, deleteCancelledLeaveRequest, deleteLeaveType, listLeaveRequests, listLeaveTypes, updateLeaveType } from './leaveApi';
import type { LeavePolicyTypePayload } from './leaveTypes';

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
function useInvalidateLeaveTypes() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['leave-types'] });
  };
}

export function useCreateLeaveType() {
  const invalidate = useInvalidateLeaveTypes();
  return useMutation({
    mutationFn: createLeaveType,
    onSuccess: invalidate,
  });
}

export function useUpdateLeaveType() {
  const invalidate = useInvalidateLeaveTypes();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LeavePolicyTypePayload }) =>
      updateLeaveType(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteLeaveType() {
  const invalidate = useInvalidateLeaveTypes();
  return useMutation({
    mutationFn: deleteLeaveType,
    onSuccess: invalidate,
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
