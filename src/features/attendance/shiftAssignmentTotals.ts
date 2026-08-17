import { summarizeShiftPayroll } from './shiftPayrollCatalog';
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
  const codes: (string | null)[] = [];

  for (const day of days) {
    // Ngoài khoảng tính công thì không quy được về ca hay nghỉ.
    if (!day.inAttendanceWindow) {
      outOfWindowDays += 1;
      continue;
    }
    // Ca đã phân vẫn tính công kể cả trên ngày lễ: mã ca là căn cứ tính, còn
    // cột "Ngày lễ" bên dưới chỉ để HR đối chiếu lịch.
    if (day.shift) {
      codes.push(day.shift.code);
      assignedDays += 1;
    }
    if (isHoliday(day)) {
      holidayDays += 1;
      continue;
    }
    if (day.shift) continue;
    if (day.isWorkingDay || day.calendarIsWorkingDay) {
      unassignedWorkingDays += 1;
      continue;
    }
    offDays += 1;
  }

  const payroll = summarizeShiftPayroll(codes);

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

export function summarizeAssignmentRowFor(
  row: Pick<ShiftAssignmentGridRow, 'days'>,
): ShiftAssignmentRowTotals {
  return summarizeAssignmentRow(row.days);
}

/**
 * Tổng theo ngày cho dòng "Tổng cộng" dưới bảng: mỗi ngày đếm số CBNV đã có ca.
 * Mẫu Excel cộng số công theo cột ngày; ở đây là số người được phân ca, vì
 * payload chưa có dayValue để quy ra công.
 */
export function summarizeAssignedPerDay(
  rows: readonly Pick<ShiftAssignmentGridRow, 'days'>[],
  daysInMonth: number,
): number[] {
  const perDay = Array.from({ length: daysInMonth }, () => 0);
  for (const row of rows) {
    for (const day of row.days) {
      if (day.day < 1 || day.day > daysInMonth) continue;
      if (day.inAttendanceWindow && day.shift) {
        perDay[day.day - 1] += 1;
      }
    }
  }
  return perDay;
}
