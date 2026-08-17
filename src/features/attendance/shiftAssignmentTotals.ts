import type {
  ShiftAssignmentGridDay,
  ShiftAssignmentGridRow,
} from './workScheduleTypes';

/**
 * Tổng kết một dòng phân ca trong tháng.
 *
 * LƯU Ý PHẠM VI: đây là tổng của **lịch đã phân**, không phải công thực tế.
 * Bảng phân ca chỉ giữ ca được gán cho từng ngày; nó không có ký hiệu chấm công
 * (P, L, NB, VR…) nên không thể dựng đủ 6 cột như mẫu Excel BCC. Các cột nghỉ
 * phép / nghỉ bù / nghỉ việc riêng chỉ có sau khi CBNV vào BCC và có dữ liệu
 * chấm công — chúng nằm ở Bảng công tháng (bccSummary.ts + TimesheetGridPage).
 *
 * Ngoài ra API grid hiện chỉ trả { id, code, name } cho mỗi ca, không có
 * dayValue, nên "ngày có ca" đếm theo số ngày chứ không quy ra số công: một ca
 * 24 giờ (dayValue 3) vẫn tính là 1 ngày. Muốn cột này ra đúng số công thì phải
 * bổ sung dayValue vào payload phía API trước.
 */
export interface ShiftAssignmentRowTotals {
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
 * Phân loại mỗi ngày vào đúng một nhóm, để các cột cộng lại bằng số ngày trong
 * tháng thay vì đếm trùng.
 */
export function summarizeAssignmentRow(
  days: readonly ShiftAssignmentGridDay[],
): ShiftAssignmentRowTotals {
  const totals: ShiftAssignmentRowTotals = {
    assignedDays: 0,
    unassignedWorkingDays: 0,
    offDays: 0,
    holidayDays: 0,
    outOfWindowDays: 0,
  };

  for (const day of days) {
    // Ngoài khoảng tính công thì không quy được về ca hay nghỉ.
    if (!day.inAttendanceWindow) {
      totals.outOfWindowDays += 1;
      continue;
    }
    // Ngày lễ tách riêng: có phân ca hay không vẫn là ngày lễ.
    if (isHoliday(day)) {
      totals.holidayDays += 1;
      continue;
    }
    if (day.shift) {
      totals.assignedDays += 1;
      continue;
    }
    if (day.isWorkingDay || day.calendarIsWorkingDay) {
      totals.unassignedWorkingDays += 1;
      continue;
    }
    totals.offDays += 1;
  }

  return totals;
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
