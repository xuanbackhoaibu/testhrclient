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
  /**
   * Ô được backend dựng để xem trước bảng công cũ chưa có bản ghi lưu trữ.
   * Chỉ dùng để hiển thị, không được cho HR sửa tay như dữ liệu TimesheetDay.
   */
  isDerived?: boolean;

  displaySymbol: string;
  paidDays: number;
  leaveDays: number;
  isWorkingDay: boolean;
  holidayName: string | null;
  firstPunch: string | null;
  lastPunch: string | null;
  totalMinutes?: number | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  needsExplanation: boolean;
  hasAdjustment: boolean;
  isLocked: boolean;
  source?: string;
  /** Ca đã dùng để tính ô này; null khi ngày đó không có ca. */
  shiftCode?: string | null;
  shiftName?: string | null;
  /** Giờ vào/ra của ca — để biết ca có kéo sang hôm sau không. API cũ có thể thiếu. */
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
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
  /** Mã thô từ BioTime/MCB, luôn được ưu tiên hiển thị trên BCC. */
  attendanceCode?: string | null;
  /** Mã HR nội bộ: chỉ giữ làm định danh/tie-break, không hiển thị trên BCC. */
  employeeCode: string;
  fullName: string;
  /** HR bật cho lãnh đạo/nhân sự đặc thù không cần log chấm công. */
  attendanceAutoFullDay: boolean;
  /**
   * Thứ tự HR sắp tay trong phòng ban (màn Thứ tự nhân sự). null = chưa sắp,
   * dòng đó xếp sau và so theo mã chấm công như mặc định.
   */
  rowOrder?: number | null;
  departmentId: string | null;
  /** Mã phòng ban tại thời điểm của kỳ công, dùng để nhóm/sắp xếp BCC ổn định. */
  departmentCode?: string | null;
  departmentName: string | null;
  unitId: string | null;
  /** Mã đơn vị tại thời điểm của kỳ công, dùng để nhóm/sắp xếp BCC ổn định. */
  unitCode?: string | null;
  unitName: string | null;
  /** Ngày đầu được tính công từ bảng sắp ca tháng (nếu đã khởi tạo). */
  attendanceFrom?: string | null;
  /** Ngày cuối được tính công từ bảng sắp ca tháng (nếu có giới hạn). */
  attendanceTo?: string | null;
  /** Ngày nghỉ việc trong kỳ; vẫn giữ dòng BCC để đối chiếu lịch sử. */
  terminationEffectiveDate?: string | null;
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
  /** Chỉ xem/xuất bảng công của một nhân sự đã chọn. */
  employeeId?: string;
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
  departmentId?: string;
  unitId?: string;
  departmentIds?: string[];
  unitIds?: string[];
}

export interface RecomputeResult {
  processed: number;
  skippedLocked: number;
  skippedAdjusted: number;
  skippedClosed?: number;
}

export type TimesheetRecomputeJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export interface TimesheetRecomputeJob {
  id: string;
  status: TimesheetRecomputeJobStatus;
  fromDate: string;
  toDate: string;
  totalEmployees: number;
  /** Number of employees that have source attendance data in the selected range. */
  eligibleEmployees?: number;
  totalMonths: number;
  /** Months in the requested range that contain source attendance data. */
  eligibleMonths?: number;
  skippedNoSourceMonths?: number;
  /** Source-bearing calendar months, returned for a truthful range preview. */
  sourceMonths?: { year: number; month: number }[];
  estimatedCells?: number;
  totalBatches?: number;
  completedBatches?: number;
  /** Server-calculated progress; do not infer it from requested calendar months. */
  progressPercent?: number;
  completedMonths: number;
  currentMonth: { year: number; month: number } | null;
  processed: number;
  skippedLocked: number;
  skippedAdjusted: number;
  skippedClosed: number;
  cancelRequestedAt: string | null;
  errorMessage: string | null;
  monitorUrl: string;
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
 * Chỉ hạn xác nhận sửa được. Tháng/năm và phạm vi là khóa định danh của kỳ:
 * đổi chúng sẽ kéo các xác nhận đã có sang một kỳ khác, nên phải xóa rồi mở
 * lại thay vì sửa tại chỗ.
 */
/** Một dòng trong màn sắp thứ tự nhân sự của phòng ban. */
export interface AttendanceRowOrderMember {
  employeeId: string;
  fullName: string;
  employeeCode: string;
  attendanceCode: string | null;
  /** null = chưa được sắp tay, dòng này xếp sau theo mã chấm công. */
  sortOrder: number | null;
}

export interface AttendanceRowOrder {
  department: { id: string; code: string; name: string };
  members: AttendanceRowOrderMember[];
}

export interface MoveAttendanceRowPayload {
  employeeId: string;
  /** Vị trí mới tính từ 0. */
  toIndex: number;
}

export interface UpdateTimesheetPeriodPayload {
  confirmDeadline: string;
}

/**
 * Bảng sắp ca tháng là snapshot lựa chọn nhân sự trước khi mở BCC.
 * Ca thực tế vẫn được cấu hình ở WorkShift/ShiftAssignment.
 */
export type MonthlyTimesheetRosterLifecycle =
  | "ACTIVE"
  | "NEW_HIRE"
  | "TERMINATED_IN_MONTH"
  | "NOT_ELIGIBLE";

export interface MonthlyTimesheetRoster {
  id: string;
  month: number;
  year: number;
  unitId: string;
  unit: { id: string; code: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyTimesheetRosterRow {
  memberId: string | null;
  employeeId: string;
  includedInTimesheet: boolean;
  canInclude: boolean;
  eligibilityReason: string | null;
  lifecycle: MonthlyTimesheetRosterLifecycle;
  employeeCode: string;
  attendanceCode: string | null;
  fullName: string;
  jobTitle: string | null;
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  unitCode: string | null;
  unitName: string | null;
  hireDate: string | null;
  attendanceFrom: string | null;
  attendanceTo: string | null;
  terminationEffectiveDate: string | null;
  unassignedWorkingDays: number;
}

export interface MonthlyTimesheetRosterResult {
  roster: MonthlyTimesheetRoster | null;
  summary: {
    total: number;
    selected: number;
    unassignedWorkingDays: number;
  };
  rows: MonthlyTimesheetRosterRow[];
}

export interface MonthlyTimesheetRosterQuery {
  month: number;
  year: number;
  unitId: string;
  departmentId?: string;
  search?: string;
}

export interface InitializeMonthlyTimesheetRosterPayload {
  month: number;
  year: number;
  unitId: string;
}

export interface UpdateMonthlyTimesheetRosterMemberPayload {
  employeeId: string;
  includedInTimesheet: boolean;
  attendanceFrom?: string;
  attendanceTo?: string;
}

export interface UpdateMonthlyTimesheetRosterMembersPayload {
  members: UpdateMonthlyTimesheetRosterMemberPayload[];
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
  { code: "CT", name: "Công tác", defaultPortion: 1.0 },
  { code: "BP", name: "Biệt phái", defaultPortion: 1.0 },
  { code: "TR", name: "Làm việc vào ngày nghỉ", defaultPortion: 0 },
  { code: "P", name: "Nghỉ phép cả ngày", defaultPortion: 1.0 },
  { code: "L1", name: "Nghỉ Lễ cả ngày", defaultPortion: 1.0 },
  {
    code: "L2",
    name: "Nghỉ lễ nửa ngày, nửa ngày làm việc",
    defaultPortion: 0.5,
  },
  { code: "VR", name: "Nghỉ việc riêng có lương cả ngày", defaultPortion: 1.0 },
  { code: "NB", name: "Nghỉ bù", defaultPortion: 1.0 },
  { code: "OM", name: "Nghỉ ốm", defaultPortion: 1.0 },
  { code: "CO", name: "Nghỉ con ốm", defaultPortion: 1.0 },
  { code: "TS", name: "Nghỉ thai sản", defaultPortion: 1.0 },
  { code: "NT", name: "Nghỉ tuần", defaultPortion: 0 },
  { code: "OFF", name: "Nghỉ theo ca", defaultPortion: 0 },
  { code: "KL", name: "Nghỉ không lương cả ngày", defaultPortion: 0 },
];

/** Màu ô theo ký hiệu — bám cách HR đang tô màu trên Excel. */
