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
  startHalfDaySession?: LeaveHalfDaySession;
  endHalfDaySession?: LeaveHalfDaySession;
  totalDays: number;
  annualPaidDays?: number;
  unpaidDays?: number;
  replacementEmployeeId?: string | null;
  replacementEmployee?: {
    id: string;
    employeeCode?: string | null;
    attendanceCode?: string | null;
    fullName?: string | null;
  } | null;
  reason: string;
  attachmentUrl?: string | null;
  noticeRequiredDays?: number | null;
  noticeActualDays?: number | null;
  lateSubmission?: boolean;
  status: string;
  approvalSteps?: LeaveApprovalStep[];
  currentApprovalStep?: LeaveApprovalStep | null;
}

export type LeaveHalfDaySession = "FULL_DAY" | "MORNING" | "AFTERNOON";

export interface LeaveApprovalStep {
  id: string;
  leaveRequestId: string;
  stepOrder: number;
  stepCode: string;
  stepName: string;
  status: string;
  reviewerUserId?: string | null;
  assignedReviewerUserId?: string | null;
  reviewedAt?: string | null;
  note?: string | null;
}

export interface LeavePolicyType {
  id: string;
  code: string;
  name: string;
  displaySymbol: string;
  deductsAnnualLeave: boolean;
  paid?: boolean | null;
  dayValue?: number | null;
  requiresAttachment: boolean;
  attachmentMinDays?: number | null;
  quotaMode: string;
  maxDaysPerEvent?: number | null;
  hrRuleStatus: string;
  note?: string | null;
  status: string;
}

export type LeaveQuotaMode =
  | "NONE"
  | "ANNUAL_BALANCE"
  | "COMPENSATORY_BALANCE"
  | "PER_EVENT"
  | "INSURANCE"
  | "PENDING_HR_RULE";

export interface LeavePolicyTypePayload {
  name: string;
  displaySymbol: string;
  deductsAnnualLeave: boolean;
  paid: boolean | null;
  dayValue: number | null;
  requiresAttachment: boolean;
  attachmentMinDays: number | null;
  quotaMode: LeaveQuotaMode;
  maxDaysPerEvent: number | null;
  hrRuleStatus: "CONFIRMED" | "PENDING_HR_RULE";
  note: string | null;
}

export interface LeaveRequestPayload {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  startHalfDaySession?: LeaveHalfDaySession;
  endHalfDaySession?: LeaveHalfDaySession;
  totalDays: number;
  reason: string;
  attachmentUrl?: string;
}
