import { describe, expect, it } from 'vitest';

import {
  sumAssignmentTotals,
  summarizeAssignedPerDay,
  summarizeAssignmentRow,
} from './shiftAssignmentTotals';
import type { ShiftAssignmentGridDay } from './workScheduleTypes';

function day(over: Partial<ShiftAssignmentGridDay>): ShiftAssignmentGridDay {
  return {
    date: '2026-08-01',
    day: 1,
    inAttendanceWindow: true,
    calendarIsWorkingDay: true,
    isWorkingDay: true,
    holidayName: null,
    source: 'NONE',
    shift: null,
    ...over,
  };
}

const someShift = { id: 's1', code: 'HC1', name: 'Hành chính' };

describe('summarizeAssignmentRow', () => {
  it('đếm ngày đã phân ca', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, shift: someShift }),
      day({ day: 2, shift: someShift }),
    ]);
    expect(totals.assignedDays).toBe(2);
    expect(totals.unassignedWorkingDays).toBe(0);
  });

  it('ngày làm việc chưa có ca vào cột chưa phân ca', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, shift: someShift }),
      day({ day: 2, shift: null, isWorkingDay: true }),
    ]);
    expect(totals.assignedDays).toBe(1);
    expect(totals.unassignedWorkingDays).toBe(1);
  });

  it('ngày nghỉ theo lịch công không bị coi là thiếu ca', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, isWorkingDay: false, calendarIsWorkingDay: false }),
    ]);
    expect(totals.offDays).toBe(1);
    expect(totals.unassignedWorkingDays).toBe(0);
  });

  it('ngày lễ vẫn đếm riêng, và ca phân trên ngày lễ vẫn tính công', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, holidayName: 'Quốc khánh' }),
      day({ day: 2, holidayName: 'Quốc khánh', shift: someShift }),
    ]);
    expect(totals.holidayDays).toBe(2);
    // Mã ca là căn cứ tính công, nên ca đã phân trên ngày lễ không bị bỏ.
    expect(totals.assignedDays).toBe(1);
    expect(totals.workDays).toBe(1);
  });

  it('ngày ngoài khoảng tính công không vào cột nào khác', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, inAttendanceWindow: false, isWorkingDay: true }),
      // Ngoài khoảng thì ưu tiên cột ngoài khoảng, dù có ca hay là ngày lễ.
      day({ day: 2, inAttendanceWindow: false, shift: someShift }),
      day({ day: 3, inAttendanceWindow: false, holidayName: 'Tết' }),
    ]);
    expect(totals.outOfWindowDays).toBe(3);
    expect(totals.assignedDays).toBe(0);
    expect(totals.holidayDays).toBe(0);
  });

  it('mỗi ngày chỉ vào đúng một cột nên tổng các cột bằng số ngày', () => {
    const days = [
      day({ day: 1, shift: someShift }),
      day({ day: 2, shift: null, isWorkingDay: true }),
      day({ day: 3, isWorkingDay: false, calendarIsWorkingDay: false }),
      day({ day: 4, holidayName: 'Quốc khánh' }),
      day({ day: 5, inAttendanceWindow: false }),
    ];
    const totals = summarizeAssignmentRow(days);
    const sum =
      totals.assignedDays +
      totals.unassignedWorkingDays +
      totals.offDays +
      totals.holidayDays +
      totals.outOfWindowDays;
    expect(sum).toBe(days.length);
  });

  it('dòng rỗng trả về toàn số 0', () => {
    expect(summarizeAssignmentRow([])).toEqual({
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
    });
  });

  it('ca 24 giờ là 1 ngày nhưng tính 3 công theo danh mục', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, shift: { id: 's2', code: 'VH3', name: 'Ca 24h' } }),
    ]);
    expect(totals.assignedDays).toBe(1);
    expect(totals.workDays).toBe(3);
  });

  it('ca vận hành 12 giờ tính 1.5 công', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, shift: { id: 's3', code: 'VH1', name: 'Ca ngày' } }),
      day({ day: 2, shift: { id: 's4', code: 'VH2', name: 'Ca đêm' } }),
    ]);
    expect(totals.workDays).toBe(3);
    expect(totals.assignedDays).toBe(2);
  });

  it('ca nửa ngày S1 vào cả công làm việc và nghỉ phép', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, shift: { id: 's5', code: 'S1', name: 'Sáng, chiều nghỉ P' } }),
    ]);
    expect(totals.workDays).toBe(0.5);
    expect(totals.annualLeaveDays).toBe(0.5);
    expect(totals.totalDays).toBe(1);
  });
});

describe('summarizeAssignedPerDay', () => {
  it('đếm số CBNV có ca theo từng ngày', () => {
    const rows = [
      { days: [day({ day: 1, shift: someShift }), day({ day: 2 })] },
      { days: [day({ day: 1, shift: someShift }), day({ day: 2, shift: someShift })] },
    ];
    expect(summarizeAssignedPerDay(rows, 3)).toEqual([2, 1, 0]);
  });

  it('bỏ qua ngày ngoài khoảng tính công', () => {
    const rows = [
      {
        days: [day({ day: 1, shift: someShift, inAttendanceWindow: false })],
      },
    ];
    expect(summarizeAssignedPerDay(rows, 2)).toEqual([0, 0]);
  });

  it('bỏ qua ngày vượt số ngày trong tháng', () => {
    const rows = [{ days: [day({ day: 31, shift: someShift })] }];
    expect(summarizeAssignedPerDay(rows, 30)).toHaveLength(30);
    expect(summarizeAssignedPerDay(rows, 30).every((n) => n === 0)).toBe(true);
  });

  it('không có dòng nào thì mỗi ngày là 0', () => {
    expect(summarizeAssignedPerDay([], 3)).toEqual([0, 0, 0]);
  });
});

describe('sumAssignmentTotals', () => {
  it('cộng nhiều dòng và giữ cột (6) khớp tổng (1)..(5)', () => {
    const a = summarizeAssignmentRow([
      day({ day: 1, shift: { id: 's', code: 'VH1', name: 'Ca ngày' } }),
      day({ day: 2, shift: { id: 's', code: 'S1', name: 'Nửa ngày' } }),
    ]);
    const b = summarizeAssignmentRow([
      day({ day: 1, shift: { id: 's', code: 'VH3', name: 'Ca 24h' } }),
    ]);
    const sum = sumAssignmentTotals([a, b]);

    expect(sum.workDays).toBe(1.5 + 0.5 + 3);
    expect(sum.annualLeaveDays).toBe(0.5);
    expect(sum.assignedDays).toBe(3);
    expect(sum.totalDays).toBe(
      sum.workDays +
        sum.publicHolidayDays +
        sum.annualLeaveDays +
        sum.personalLeaveDays +
        sum.compensatoryLeaveDays,
    );
  });

  it('không để lại đuôi dấu phẩy động khi cộng nhiều nửa công', () => {
    const half = summarizeAssignmentRow([
      day({ day: 1, shift: { id: 's', code: 'S1', name: 'Nửa ngày' } }),
    ]);
    const sum = sumAssignmentTotals(Array.from({ length: 7 }, () => half));
    expect(sum.workDays).toBe(3.5);
    expect(sum.annualLeaveDays).toBe(3.5);
  });

  it('danh sách rỗng trả về toàn số 0', () => {
    expect(sumAssignmentTotals([])).toMatchObject({
      workDays: 0,
      totalDays: 0,
      assignedDays: 0,
    });
  });
});
