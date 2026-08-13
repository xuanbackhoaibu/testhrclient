export const LEAVE_APPROVAL_STEP_CODES = [
  'ATTENDANCE_TRACKER',
  'DEPARTMENT_MANAGER',
  'OFFICE_CHIEF',
  'BOARD',
] as const;

export type LeaveApprovalStepCode = (typeof LEAVE_APPROVAL_STEP_CODES)[number];

export interface LeaveApprovalReviewer {
  id: string;
  fullName: string | null;
  email: string | null;
}

export interface LeaveApprovalAssignment {
  id: string;
  stepCode: LeaveApprovalStepCode;
  scopeType: 'GLOBAL' | 'DEPARTMENT';
  scopeKey: string;
  departmentId: string | null;
  reviewerUserId: string;
  reviewer: {
    id: string;
    fullName: string | null;
    status: string;
  };
  department: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface UpsertLeaveApprovalAssignmentPayload {
  reviewerUserId: string;
  departmentId?: string;
}
