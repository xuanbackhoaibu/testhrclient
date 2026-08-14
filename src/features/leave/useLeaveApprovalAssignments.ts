import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteLeaveApprovalAssignment,
  listLeaveApprovalAssignments,
  listLeaveApprovalReviewers,
  upsertLeaveApprovalAssignment,
} from './leaveApprovalApi';
import type {
  LeaveApprovalStepCode,
  UpsertLeaveApprovalAssignmentPayload,
} from './leaveApprovalTypes';

const approvalAssignmentsQueryKey = ['leave-approval-assignments'] as const;

export function useLeaveApprovalAssignments() {
  return useQuery({
    queryKey: approvalAssignmentsQueryKey,
    queryFn: listLeaveApprovalAssignments,
  });
}

export function useLeaveApprovalReviewers() {
  return useQuery({
    queryKey: ['leave-approval-reviewers'],
    queryFn: listLeaveApprovalReviewers,
  });
}

export function useUpsertLeaveApprovalAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      stepCode: LeaveApprovalStepCode;
      payload: UpsertLeaveApprovalAssignmentPayload;
    }) => upsertLeaveApprovalAssignment(input.stepCode, input.payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: approvalAssignmentsQueryKey });
    },
  });
}

export function useDeleteLeaveApprovalAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { stepCode: LeaveApprovalStepCode; departmentId?: string }) =>
      deleteLeaveApprovalAssignment(input.stepCode, input.departmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: approvalAssignmentsQueryKey });
    },
  });
}
