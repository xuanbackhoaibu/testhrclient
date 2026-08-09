export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employee?: {
    id: string;
    employeeCode?: string | null;
    fullName?: string | null;
  } | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  approvalSteps?: LeaveApprovalStep[];
}

export interface LeaveApprovalStep {
  id: string;
  leaveRequestId: string;
  stepOrder: number;
  stepCode: string;
  stepName: string;
  status: string;
  reviewerUserId?: string | null;
  reviewedAt?: string | null;
  note?: string | null;
}

export interface LeaveRequestPayload {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
}

