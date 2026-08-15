/**
 * Ca làm việc & lịch năm — Phase 1.
 * Khớp với hr-api-service: src/modules/attendance/dto/work-schedule.dto.ts
 * Quy tắc nguồn: zcong-ca-phep-docx/05-QUY-TAC-NGHIEP-VU-CHOT.md
 */

export type RecordStatus = "ACTIVE" | "INACTIVE";

export interface WorkShift {
  id: string;
  code: string;
  name: string;
  groupName: string | null;
  checkInStart: string | null;
  startTime: string;
  checkInEnd: string | null;
  endTime: string;
  checkOutStart: string | null;
  checkOutEnd: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  breakDeducted: boolean;
  standardMinutes: number;
  /**
   * Số công của ca. LƯU Ý: ca thứ 7 làm 240 phút nhưng dayValue = 1.0
   * (HR chốt A3) — không được suy số công từ số phút ở bất kỳ đâu.
   */
  dayValue: number;
  /** Ngưỡng ĐÁNH DẤU, chưa phải ngưỡng phạt — HR chưa quyết mức xử lý (B1). */
  lateThresholdMinutes: number;
  earlyLeaveThresholdMinutes: number;
  maxOvertimeMinutes: number;
  status: RecordStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkShiftPayload {
  code: string;
  name: string;
  groupName?: string | null;
  checkInStart?: string | null;
  startTime: string;
  checkInEnd?: string | null;
  endTime: string;
  checkOutStart?: string | null;
  checkOutEnd?: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  breakDeducted?: boolean;
  standardMinutes: number;
  dayValue?: number;
  lateThresholdMinutes?: number;
  earlyLeaveThresholdMinutes?: number;
  maxOvertimeMinutes?: number;
  note?: string | null;
  status?: RecordStatus;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  year: number;
  isPaid: boolean;
  note: string | null;
}

export interface HolidayPayload {
  date: string;
  name: string;
  isPaid?: boolean;
  note?: string;
}

export interface CloneHolidaysPayload {
  fromYear: number;
  toYear: number;
}

export interface CloneHolidaysResult {
  created: number;
  skipped: number;
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  employeeId: string | null;
  departmentId: string | null;
  unitId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  /** 0 = Chủ nhật … 6 = Thứ 7; null/omitted means every day. */
  weekdays?: number[] | null;
  status: RecordStatus;
  note: string | null;
  shift: { code: string; name: string };
  employee: { employeeCode: string; fullName: string } | null;
  department: { code: string; name: string } | null;
  unit: { code: string; name: string } | null;
}

export interface ShiftAssignmentPayload {
  shiftId: string;
  employeeId?: string;
  departmentId?: string;
  unitId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  /** Omit to keep the all-days assignment default. */
  weekdays?: number[];
  note?: string;
}

/**
 * Chỉ sửa phạm vi thứ của một quy tắc đã có. `null` khôi phục áp dụng cả
 * tuần; các trường đích gán, ca và khoảng hiệu lực không được thay đổi ở API
 * này để tránh làm mất lịch sử phân ca.
 */
export interface UpdateShiftAssignmentWeekdaysPayload {
  weekdays: number[] | null;
}

/**
 * Lưới phân ca tháng. Khác với BCC: đây là ca kế hoạch được resolver tính
 * theo đúng thứ tự cá nhân > phòng ban > đơn vị, chưa phải ký hiệu công.
 */
export interface ShiftAssignmentGridQuery {
  month: number;
  year: number;
  unitId: string;
  departmentId?: string;
  search?: string;
}

export interface ShiftAssignmentGridDay {
  date: string;
  day: number;
  /** Ngoài ngày vào làm/ngày nghỉ việc nên không được áp ca trong kỳ này. */
  inAttendanceWindow: boolean;
  /** Lịch công cho phép phân ca, kể cả khi CBNV chưa có ca cá nhân. */
  calendarIsWorkingDay: boolean;
  isWorkingDay: boolean;
  holidayName: string | null;
  source: string;
  shift: { id: string; code: string; name: string } | null;
}

export interface ShiftAssignmentGridRow {
  employeeId: string;
  includedInTimesheet: boolean;
  canInclude: boolean;
  eligibilityReason: string | null;
  lifecycle: "ACTIVE" | "NEW_HIRE" | "TERMINATED_IN_MONTH" | "NOT_ELIGIBLE";
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
  days: ShiftAssignmentGridDay[];
}

export interface ShiftAssignmentGrid {
  month: number;
  year: number;
  daysInMonth: number;
  rosterConfigured: boolean;
  isClosed: boolean;
  rows: ShiftAssignmentGridRow[];
}

export interface BulkShiftAssignmentPayload {
  month: number;
  year: number;
  unitId: string;
  employeeIds: string[];
  shiftId: string;
  effectiveFrom: string;
  effectiveTo: string;
  /** Omit to keep the all-days assignment default. */
  weekdays?: number[];
  /**
   * Đưa đúng các CBNV vừa phân ca vào BCC của kỳ này. Mặc định backend là
   * false để vẫn hỗ trợ trường hợp chỉ lập kế hoạch ca.
   */
  includeInTimesheet?: boolean;
  note?: string;
}

export interface BulkShiftAssignmentResult {
  created: number;
  affected: Array<{
    employeeId: string;
    effectiveFrom: string;
    effectiveTo: string;
  }>;
  recomputeRequired: boolean;
  /** Null khi thao tác chỉ lập kế hoạch ca, chưa đưa vào BCC. */
  rosterId: string | null;
  includedInTimesheet: number;
}

/**
 * Đưa các CBNV đã có ca vào BCC mà không tạo hoặc thay đổi ShiftAssignment.
 * Backend khởi tạo roster tháng trong cùng transaction nếu chưa có.
 */
export interface IncludeShiftAssignmentRowsInTimesheetPayload {
  month: number;
  year: number;
  unitId: string;
  employeeIds: string[];
}

export interface IncludeShiftAssignmentRowsInTimesheetResult {
  rosterId: string;
  includedInTimesheet: number;
  recomputeRequired: boolean;
  affected: Array<{
    employeeId: string;
    attendanceFrom: string;
    attendanceTo: string | null;
  }>;
}

export interface WorkCalendarDay {
  id: string;
  weekday: number;
  isWorkingDay: boolean;
  shiftId: string | null;
  shift: { code: string; name: string; dayValue: number } | null;
}

export interface WorkCalendarDayPayload {
  weekday: number;
  isWorkingDay: boolean;
  shiftId?: string | null;
}

/** weekday theo JS Date.getDay(): 0 = Chủ nhật … 6 = Thứ 7. */
export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};
