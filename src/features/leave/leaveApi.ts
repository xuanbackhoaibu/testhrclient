import { api } from '../../shared/api/httpClient';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockLeaveRequests } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import type { LeaveApprovalStep, LeavePolicyType, LeaveRequest, LeaveRequestPayload } from './leaveTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
const mockApprovalSteps = [
  { stepOrder: 1, stepCode: 'ATTENDANCE_TRACKER', stepName: 'Nguoi theo doi cham cong' },
  { stepOrder: 2, stepCode: 'DEPARTMENT_MANAGER', stepName: 'Truong bo phan' },
  { stepOrder: 3, stepCode: 'OFFICE_CHIEF', stepName: 'Chanh van phong' },
  { stepOrder: 4, stepCode: 'BOARD', stepName: 'Ban TGD' },
] as const;
const mockLeavePolicyTypes: LeavePolicyType[] = [
  { id: 'lpt-work-full', code: 'WORK_FULL', name: 'Lam viec ca ngay', displaySymbol: '+', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-work-half', code: 'WORK_HALF', name: 'Lam viec nua ngay', displaySymbol: '-', deductsAnnualLeave: false, paid: true, dayValue: 0.5, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-annual', code: 'ANNUAL', name: 'Nghi phep nam', displaySymbol: 'P', deductsAnnualLeave: true, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'ANNUAL_BALANCE', hrRuleStatus: 'CONFIRMED', note: 'Chi ky hieu P tru quy phep nam.', status: 'ACTIVE' },
  { id: 'lpt-paid-personal', code: 'PAID_PERSONAL', name: 'Nghi viec rieng co luong', displaySymbol: 'CL', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'PER_EVENT', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-unpaid', code: 'UNPAID', name: 'Nghi khong luong', displaySymbol: 'KL', deductsAnnualLeave: false, paid: false, dayValue: 0, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-sick', code: 'SICK', name: 'Nghi om', displaySymbol: 'Ô', deductsAnnualLeave: false, paid: null, dayValue: null, requiresAttachment: true, attachmentMinDays: 3, quotaMode: 'INSURANCE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-child-sick', code: 'CHILD_SICK', name: 'Nghi con om', displaySymbol: 'Cô', deductsAnnualLeave: false, paid: null, dayValue: null, requiresAttachment: true, quotaMode: 'INSURANCE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-maternity', code: 'MATERNITY', name: 'Thai san', displaySymbol: 'TS', deductsAnnualLeave: false, paid: null, dayValue: null, requiresAttachment: true, quotaMode: 'INSURANCE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-work-accident', code: 'WORK_ACCIDENT', name: 'Tai nan lao dong', displaySymbol: 'TN', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: true, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-compensatory', code: 'COMPENSATORY', name: 'Nghi bu', displaySymbol: 'NB', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'COMPENSATORY_BALANCE', hrRuleStatus: 'PENDING_HR_RULE', note: 'Ty le quy doi va han su dung con treo D3.', status: 'ACTIVE' },
  { id: 'lpt-holiday', code: 'HOLIDAY', name: 'Le Tet', displaySymbol: 'L', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-company-trip', code: 'COMPANY_TRIP', name: 'Du lich', displaySymbol: 'DL', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-work-stop', code: 'WORK_STOP', name: 'Nghi ngung viec', displaySymbol: 'N', deductsAnnualLeave: false, paid: null, dayValue: 0, requiresAttachment: false, quotaMode: 'PENDING_HR_RULE', hrRuleStatus: 'PENDING_HR_RULE', status: 'ACTIVE' },
  { id: 'lpt-business-trip', code: 'BUSINESS_TRIP', name: 'Cong tac', displaySymbol: 'CT', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-secondment', code: 'SECONDMENT', name: 'Cong tac biet phai', displaySymbol: 'BP', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-office-duty', code: 'OFFICE_DUTY', name: 'Truc VP', displaySymbol: 'Tr', deductsAnnualLeave: false, paid: true, dayValue: null, requiresAttachment: false, quotaMode: 'PENDING_HR_RULE', hrRuleStatus: 'PENDING_HR_RULE', note: 'Tinh theo gio; doi HR chot D2.', status: 'ACTIVE' },
  { id: 'lpt-meeting', code: 'MEETING', name: 'Hoi hop', displaySymbol: 'H', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-compulsory-labor', code: 'COMPULSORY_LABOR', name: 'Lao dong nghia vu', displaySymbol: 'Lđ', deductsAnnualLeave: false, paid: true, dayValue: 0, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
  { id: 'lpt-online-work', code: 'ONLINE_WORK', name: 'Lam viec online', displaySymbol: 'O', deductsAnnualLeave: false, paid: true, dayValue: 1, requiresAttachment: false, quotaMode: 'NONE', hrRuleStatus: 'CONFIRMED', status: 'ACTIVE' },
];

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

export async function listLeaveTypes(): Promise<LeavePolicyType[]> {
  if (isMockMode) {
    await mockDelay();
    return mockLeavePolicyTypes;
  }

  return api.get<LeavePolicyType[]>('/leave/types');
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
