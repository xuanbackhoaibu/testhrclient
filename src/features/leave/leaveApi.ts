import { api } from '../../shared/api/httpClient';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockLeaveRequests } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type { LeaveApprovalStep, LeaveRequest, LeaveRequestPayload } from './leaveTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
const mockApprovalSteps = [
  { stepOrder: 1, stepCode: 'ATTENDANCE_TRACKER', stepName: 'Nguoi theo doi cham cong' },
  { stepOrder: 2, stepCode: 'DEPARTMENT_MANAGER', stepName: 'Truong bo phan' },
  { stepOrder: 3, stepCode: 'OFFICE_CHIEF', stepName: 'Chanh van phong' },
  { stepOrder: 4, stepCode: 'BOARD', stepName: 'Ban TGD' },
] as const;

function buildMockApprovalSteps(leaveRequestId: string): LeaveApprovalStep[] {
  return mockApprovalSteps.map((step) => ({
    id: `${leaveRequestId}-step-${step.stepOrder}`,
    leaveRequestId,
    ...step,
    status: 'SUBMITTED',
    reviewerUserId: null,
    reviewedAt: null,
    note: null,
  }));
}

function ensureMockApprovalSteps(leave: LeaveRequest) {
  if (!leave.approvalSteps?.length) {
    leave.approvalSteps = buildMockApprovalSteps(leave.id);
  }
  return leave.approvalSteps;
}

export async function listLeaveRequests(params: ListQueryParams = {}): Promise<PaginatedResponse<LeaveRequest>> {
  if (isMockMode) {
    await mockDelay();
    mockLeaveRequests.forEach(ensureMockApprovalSteps);
    const filtered = mockLeaveRequests
      .filter((item) => (params.employeeId ? item.employeeId === params.employeeId : true))
      .filter((item) => (params.leaveType ? item.leaveType === params.leaveType : true))
      .filter((item) => (params.status ? item.status === params.status : true))
      .filter(
        (item) =>
          includesIgnoreCase(item.employeeName, params.search) ||
          includesIgnoreCase(item.reason, params.search) ||
          (!params.search && true),
      );

    return paginate(filtered, params);
  }

  const response = await api.get<PaginatedData<LeaveRequest>>('/leave/requests', { params });
  return normalizePaginatedResponse<LeaveRequest>(response, params);
}

export async function createLeaveRequest(payload: LeaveRequestPayload): Promise<LeaveRequest> {
  if (isMockMode) {
    await mockDelay();
    const employee = mockEmployees.find((item) => item.id === payload.employeeId);
    const leaveRequest: LeaveRequest = {
      id: generateId('lv'),
      employeeName: employee?.fullName ?? payload.employeeId,
      ...payload,
      status: 'DRAFT',
    };
    leaveRequest.approvalSteps = buildMockApprovalSteps(leaveRequest.id);
    mockLeaveRequests.unshift(leaveRequest);
    appendAuditLog({ entityType: 'LEAVE_REQUEST', entityId: leaveRequest.id, action: 'CREATE', afterJson: leaveRequest as unknown as Record<string, unknown> });
    return leaveRequest;
  }

  return api.post<LeaveRequest>('/leave/requests', payload);
}

async function updateLeaveStatus(id: string, status: string, action: string): Promise<LeaveRequest> {
  if (isMockMode) {
    await mockDelay();
    const leave = mockLeaveRequests.find((item) => item.id === id);
    if (!leave) {
      throw new Error('Leave request not found');
    }
    const before = {
      ...leave,
      approvalSteps: leave.approvalSteps?.map((step) => ({ ...step })),
    };
    const steps = ensureMockApprovalSteps(leave);
    if (action === 'APPROVE') {
      const currentStep = steps.find((step) => step.status === 'SUBMITTED');
      if (currentStep) {
        currentStep.status = 'APPROVED';
        currentStep.reviewerUserId = 'mock-reviewer';
        currentStep.reviewedAt = new Date().toISOString();
        leave.status = currentStep.stepOrder === mockApprovalSteps.length ? 'APPROVED' : 'SUBMITTED';
      }
    } else if (action === 'REJECT') {
      const currentStep = steps.find((step) => step.status === 'SUBMITTED');
      if (currentStep) {
        currentStep.status = 'REJECTED';
        currentStep.reviewerUserId = 'mock-reviewer';
        currentStep.reviewedAt = new Date().toISOString();
      }
      leave.status = status;
    } else if (action === 'CANCEL') {
      steps
        .filter((step) => step.status === 'SUBMITTED')
        .forEach((step) => {
          step.status = 'CANCELLED';
        });
      leave.status = status;
    } else {
      leave.status = status;
    }
    appendAuditLog({
      entityType: 'LEAVE_REQUEST',
      entityId: id,
      action,
      beforeJson: before as unknown as Record<string, unknown>,
      afterJson: leave as unknown as Record<string, unknown>,
    });
    return leave;
  }

  return api.post<LeaveRequest>(`/leave/requests/${id}/${action.toLowerCase()}`);
}

export function submitLeaveRequest(id: string) {
  return updateLeaveStatus(id, 'SUBMITTED', 'SUBMIT');
}

export function approveLeaveRequest(id: string) {
  return updateLeaveStatus(id, 'APPROVED', 'APPROVE');
}

export function rejectLeaveRequest(id: string) {
  return updateLeaveStatus(id, 'REJECTED', 'REJECT');
}

export function cancelLeaveRequest(id: string) {
  return updateLeaveStatus(id, 'CANCELLED', 'CANCEL');
}
