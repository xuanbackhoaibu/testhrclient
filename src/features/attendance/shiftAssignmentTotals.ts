import { summarizeAssignedShifts } from './shiftPayrollCatalog';
import { isOvernightShiftTime } from './shiftTime';
import type {
  ShiftAssignmentGridDay,
  ShiftAssignmentGridRow,
} from './workScheduleTypes';

/**
 * Tổng kết một dòng phân ca trong tháng.
 *
 * Sáu cột đầu là 6 cột của bảng chấm công mẫu, quy ra SỐ CÔNG theo danh mục
 * 'Ca làm việc' (xem shiftPayrollCatalog.ts): ca vận hành 12 giờ là 1.5 công, ca
 * 24 giờ là 3 công, ca nửa ngày S1 vừa cho 0.5 công làm việc vừa cho 0.5 công
 * nghỉ phép. Nhờ mã nghỉ có công làm việc bằng 0 nên totalDays không cộng trùng.
 *
 * Các cột sau đó là thông tin riêng của bảng phân ca (không có trong mẫu):
 * ngày còn thiếu ca, ngày nghỉ theo lịch, ngày ngoài khoảng tính công — đây là
 * phần giúp HR thấy việc phân ca còn hở chỗ nào.
 */
export interface ShiftAssignmentRowTotals {
  /** (1) Công làm việc thực tế, quy theo số công của ca. */
  workDays: number;
  /** (2) Nghỉ lễ. */
  publicHolidayDays: number;
  /** (3) Nghỉ phép. */
  annualLeaveDays: number;
  /** (4) Nghỉ việc riêng. */
  personalLeaveDays: number;
  /** (5) Nghỉ bù. */
  compensatoryLeaveDays: number;
  /** (6) = (1)+(2)+(3)+(4)+(5). */
  totalDays: number;
  /** Số ngày đã có ca trong khoảng tính công. */
  assignedDays: number;
  /** Ngày lịch công cho làm việc nhưng chưa phân ca — phần việc còn thiếu. */
  unassignedWorkingDays: number;
  /** Ngày nghỉ theo lịch công (không tính ngày lễ). */
  offDays: number;
  /** Ngày lễ trong khoảng tính công. */
  holidayDays: number;
  /** Ngày nằm ngoài khoảng tính công (vào làm muộn / đã nghỉ việc). */
  outOfWindowDays: number;
}

function isHoliday(day: ShiftAssignmentGridDay): boolean {
  return day.holidayName !== null;
}

/**
 * Ngày này có bị ca qua đêm của hôm trước chiếm không.
 *
 * Ca VH2 19:30–07:30 bắt đầu ngày N và kết thúc sáng ngày N+1, nên ngày N+1 đã
 * có người trực suốt buổi sáng. Đếm nó vào "Ngày làm việc chưa phân ca" là bảo
 * HR đi phân ca cho một ngày đã kín lịch — với ca 24 giờ (VH3) thì càng vô lý.
 *
 * Căn cứ là CẤU HÌNH CA của ngày liền trước, cùng quy tắc với lưới bảng công.
 */
function isCoveredByPreviousOvernightShift(
  previousDay: ShiftAssignmentGridDay | undefined,
): boolean {
  const shift = previousDay?.shift;
  if (!shift) return false;
  return isOvernightShiftTime(shift.startTime, shift.endTime);
}

/**
 * Sáu cột công tính từ mã ca đã phân; các cột đếm ngày phân loại mỗi ngày vào
 * đúng một nhóm nên chúng cộng lại bằng số ngày trong tháng.
 */
export function summarizeAssignmentRow(
  days: readonly ShiftAssignmentGridDay[],
): ShiftAssignmentRowTotals {
  let assignedDays = 0;
  let unassignedWorkingDays = 0;
  let offDays = 0;
  let holidayDays = 0;
  let outOfWindowDays = 0;
  const assigned: { code: string; dayValue?: number }[] = [];

  for (const [index, day] of days.entries()) {
    // Ngoài khoảng tính công thì không quy được về ca hay nghỉ.
    if (!day.inAttendanceWindow) {
      outOfWindowDays += 1;
      continue;
    }
    // Ca đã phân vẫn tính công kể cả trên ngày lễ: mã ca là căn cứ tính, còn
    // cột "Ngày lễ" bên dưới chỉ để HR đối chiếu lịch.
    //
    // Ngày lễ CÓ ca chỉ được đếm vào `assignedDays`, không cộng thêm vào
    // `holidayDays`: đếm cả hai thì một ngày vào hai nhóm, tổng phân loại vượt
    // số ngày trong tháng (31 ngày ra 32) và HR không đối chiếu nổi lịch còn
    // hở chỗ nào. Ca là căn cứ tính công nên nó thắng.
    if (day.shift) {
      assigned.push({
        code: day.shift.code,
        dayValue: day.shift.dayValue,
      });
      assignedDays += 1;
      continue;
    }
    if (isHoliday(day)) {
      holidayDays += 1;
      continue;
    }
    if (day.isWorkingDay || day.calendarIsWorkingDay) {
      // Ngày đã bị ca đêm hôm trước chiếm thì không còn là việc HR phải phân —
      // xếp vào nhóm nghỉ theo lịch để tổng phân loại vẫn khớp số ngày.
      if (isCoveredByPreviousOvernightShift(days[index - 1])) {
        offDays += 1;
        continue;
      }
      unassignedWorkingDays += 1;
      continue;
    }
    offDays += 1;
  }

  const payroll = summarizeAssignedShifts(assigned);

  return {
    ...payroll,
    assignedDays,
    unassignedWorkingDays,
    offDays,
    holidayDays,
    outOfWindowDays,
  };
}

const EMPTY_TOTALS: ShiftAssignmentRowTotals = {
  workDays: 0,
  publicHolidayDays: 0,
  annualLeaveDays: 0,
  personalLeaveDays: 0,
  compensatoryLeaveDays: 0,
  totalDays: 0,
  assignedDays: 0,
  unassignedWorkingDays: 0,
  offDays: 0,
  holidayDays: 0,
  outOfWindowDays: 0,
};

/** Cộng các dòng lại cho dòng "Tổng cộng" dưới bảng. */
export function sumAssignmentTotals(
  rows: readonly ShiftAssignmentRowTotals[],
): ShiftAssignmentRowTotals {
  const sum = { ...EMPTY_TOTALS };
  for (const row of rows) {
    for (const key of Object.keys(EMPTY_TOTALS) as (keyof ShiftAssignmentRowTotals)[]) {
      sum[key] += row[key];
    }
  }
  // Công là bội của 0.5; cộng dồn nhiều dòng dễ để lại đuôi dấu phẩy động.
  for (const key of Object.keys(EMPTY_TOTALS) as (keyof ShiftAssignmentRowTotals)[]) {
    sum[key] = Math.round(sum[key] * 2) / 2;
  }
  return sum;
}


/**
 * Dòng "Tổng cộng" dưới bảng: mỗi cột ngày cộng SỐ CÔNG của các ca phân trong
 * ngày đó, đúng như mẫu Excel (11.0, 7.0, 11.5…). Ca thiếu dayValue được coi là
 * 1 công để không âm thầm bị bỏ khỏi tổng.
 */
export function summarizeAssignedPerDay(
  rows: readonly Pick<ShiftAssignmentGridRow, 'days'>[],
  daysInMonth: number,
): number[] {
  const perDay = Array.from({ length: daysInMonth }, () => 0);
  for (const row of rows) {
    for (const day of row.days) {
      if (day.day < 1 || day.day > daysInMonth) continue;
      if (!day.inAttendanceWindow || !day.shift) continue;
      const dayValue = day.shift.dayValue;
      perDay[day.day - 1] +=
        typeof dayValue === 'number' && Number.isFinite(dayValue)
          ? dayValue
          : 1;
    }
  }
  return perDay.map((value) => Math.round(value * 2) / 2);
}

export interface RosterMismatchCounts {
  /** Đã phân ca nhưng chưa vào BCC — bảng công sẽ thiếu hẳn các CBNV này. */
  assignedNotInTimesheet: number;
  /** Đã vào BCC nhưng chưa có ca — bảng công không có căn cứ tính. */
  inTimesheetWithoutShift: number;
}

export interface RosterMismatchInput {
  includedInTimesheet: boolean;
  canInclude: boolean;
  assignedDays: number;
}

/**
 * Đếm hai nhóm khiến lịch ca và bảng công đọc ra lệch nhau.
 *
 * Phân ca và đưa vào BCC là hai việc độc lập, nên một CBNV có thể có ca mà
 * không nằm trong bảng công, hoặc nằm trong bảng công mà chưa có ca nào. Cả hai
 * đều làm bảng công hiện sai, và nhìn lưới phân ca thì không thấy ngay.
 *
 * Người chưa đủ điều kiện vào BCC (canInclude = false) không bị tính vào nhóm
 * thứ hai: họ chưa có ca là đúng, không phải việc HR cần xử lý.
 */
export function countRosterMismatch(
  rows: readonly RosterMismatchInput[],
): RosterMismatchCounts {
  let assignedNotInTimesheet = 0;
  let inTimesheetWithoutShift = 0;
  for (const row of rows) {
    const hasShift = row.assignedDays > 0;
    if (hasShift && !row.includedInTimesheet) {
      assignedNotInTimesheet += 1;
    }
    if (!hasShift && row.includedInTimesheet && row.canInclude) {
      inTimesheetWithoutShift += 1;
    }
  }
  return { assignedNotInTimesheet, inTimesheetWithoutShift };
}
