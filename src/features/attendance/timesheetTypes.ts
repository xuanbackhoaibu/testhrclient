/**
 * Bảng công ngày — Phase 2.
 * Khớp hr-api-service: src/modules/attendance/dto/timesheet.dto.ts
 * Bảng ký hiệu: zcong-ca-phep-docx/05-QUY-TAC-NGHIEP-VU-CHOT.md mục 3
 */

export interface TimesheetSegment {
  symbol: string;
  portion: number;
  source?: string;
  refId?: string | null;
}

export interface TimesheetGridDay {
  id: string;
  date: string;
  day: number;
  displaySymbol: string;
  paidDays: number;
  leaveDays: number;
  isWorkingDay: boolean;
  holidayName: string | null;
  firstPunch: string | null;
  lastPunch: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  needsExplanation: boolean;
  hasAdjustment: boolean;
  isLocked: boolean;
}

export interface BccSummary {
  actualWorkDays: number;
  publicHolidayDays: number;
  annualLeaveDays: number;
  compensatoryLeaveDays: number;
  paidPersonalLeaveDays: number;
  companyTripDays: number;
  dutyDays: number;
  unpaidLeaveDays: number;
  socialInsuranceDays: number;
  totalActualDays: number;
}

export interface TimesheetGridRow {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  /** HR bật cho lãnh đạo/nhân sự đặc thù không cần log chấm công. */
  attendanceAutoFullDay: boolean;
  departmentId: string | null;
  departmentName: string | null;
  unitId: string | null;
  unitName: string | null;
  jobTitle: string | null;
  days: TimesheetGridDay[];
  summary: {
    totalPaidDays: number;
    totalLeaveDays: number;
    countBySymbol: Record<string, number>;
    /** Optional while the deployed API is being upgraded to the BCC contract. */
    bcc?: BccSummary;
    annualLeaveUsedToMonth: number;
    annualLeaveUsedInYear: number;
  };
}

export interface TimesheetGrid {
  month: number;
  year: number;
  daysInMonth: number;
  rows: TimesheetGridRow[];
}

export interface TimesheetGridQuery {
  month: number;
  year: number;
  departmentId?: string;
  unitId?: string;
  departmentIds?: string[];
  unitIds?: string[];
}

export interface AdjustTimesheetDayPayload {
  segments: { symbol: string; portion: number }[];
  reason: string;
}

export interface RecomputePayload {
  fromDate: string;
  toDate: string;
  employeeId?: string;
}

export interface RecomputeResult {
  processed: number;
  skippedLocked: number;
  skippedAdjusted: number;
}

export interface SetAutoFullAttendancePayload {
  enabled: boolean;
  fromDate: string;
  toDate: string;
}

export interface SetAutoFullAttendanceResult {
  employeeId: string;
  attendanceAutoFullDay: boolean;
  recompute: RecomputeResult;
}

export type TimesheetPeriodStatus =
  "DRAFT" | "PENDING_EMPLOYEE" | "PENDING_HR" | "CLOSED";

export type TimesheetConfirmationStatus = "PENDING" | "CONFIRMED" | "DISPUTED";

export interface TimesheetPeriod {
  id: string;
  month: number;
  year: number;
  unitId: string | null;
  status: TimesheetPeriodStatus;
  confirmDeadline: string | null;
  openedAt: string | null;
  openedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  reopenedAt: string | null;
  reopenedBy: string | null;
  reopenReason: string | null;
  createdAt: string;
  updatedAt: string;
  unit?: { id: string; name: string } | null;
  _count?: { confirmations: number };
}

export interface TimesheetConfirmation {
  id: string;
  periodId: string;
  employeeId: string;
  status: TimesheetConfirmationStatus;
  confirmedAt: string | null;
  disputeNote: string | null;
  disputedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolveNote: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    employeeCode: string;
    fullName: string;
  };
}

export interface OpenTimesheetPeriodPayload {
  month: number;
  year: number;
  unitId?: string;
  confirmDeadline?: string;
}

export interface ReopenTimesheetPeriodPayload {
  reason: string;
}

/**
 * Bảng ký hiệu cho dropdown sửa tay. Phải khớp bảng backend —
 * `Tr` bị loại vì tính theo giờ, backend chặn (Đ2 còn treo).
 */
export const SYMBOL_OPTIONS: {
  code: string;
  name: string;
  defaultPortion: number;
}[] = [
  { code: "+", name: "Làm việc cả ngày", defaultPortion: 1.0 },
  { code: "-", name: "Làm việc nửa ngày", defaultPortion: 0.5 },
  { code: "P", name: "Nghỉ phép", defaultPortion: 1.0 },
  { code: "CL", name: "Nghỉ việc riêng có lương", defaultPortion: 1.0 },
  { code: "KL", name: "Nghỉ không lương", defaultPortion: 0 },
  { code: "Ô", name: "Nghỉ ốm", defaultPortion: 1.0 },
  { code: "Cô", name: "Nghỉ con ốm", defaultPortion: 1.0 },
  { code: "TS", name: "Thai sản", defaultPortion: 1.0 },
  { code: "TN", name: "Tai nạn lao động", defaultPortion: 1.0 },
  { code: "NB", name: "Nghỉ bù", defaultPortion: 1.0 },
  { code: "L", name: "Lễ, tết", defaultPortion: 1.0 },
  { code: "DL", name: "Du lịch", defaultPortion: 1.0 },
  { code: "N", name: "Nghỉ ngừng việc", defaultPortion: 0 },
  { code: "CT", name: "Công tác", defaultPortion: 1.0 },
  { code: "BP", name: "Công tác biệt phái", defaultPortion: 1.0 },
  { code: "H", name: "Hội họp", defaultPortion: 1.0 },
  { code: "Lđ", name: "Lao động nghĩa vụ", defaultPortion: 0 },
  { code: "O", name: "Làm việc online", defaultPortion: 1.0 },
];

/** Màu ô theo ký hiệu — bám cách HR đang tô màu trên Excel. */
export function symbolColor(displaySymbol: string): string | undefined {
  if (!displaySymbol) return undefined;
  const first = displaySymbol.split(";")[0];
  if (first === "+") return "green";
  if (first === "-") return "teal";
  if (first === "P") return "blue";
  if (first === "L") return "grape";
  if (first === "KL" || first === "N") return "gray";
  if (first === "Ô" || first === "Cô" || first === "TS") return "orange";
  return "cyan";
}
