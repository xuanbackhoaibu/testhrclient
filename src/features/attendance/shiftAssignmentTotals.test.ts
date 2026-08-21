import { describe, expect, it } from 'vitest';

import {
  countRosterMismatch,
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
    /*
     * Ngày lễ CÓ ca thuộc về nhóm "đã phân ca", không cộng thêm vào cột ngày
     * lễ. Đếm cả hai thì một ngày rơi vào hai nhóm và tổng phân loại vượt số
     * ngày trong tháng — đúng mâu thuẫn với test "mỗi ngày chỉ vào đúng một
     * cột" bên dưới, vốn chỉ không lộ ra vì ngày lễ ở đó chưa có ca.
     */
    expect(totals.holidayDays).toBe(1);
    // Mã ca là căn cứ tính công, nên ca đã phân trên ngày lễ không bị bỏ.
    expect(totals.assignedDays).toBe(1);
    expect(totals.workDays).toBe(1);
  });

  it('ngày lễ có ca không bị đếm sang cả cột ngày lễ', () => {
    const days = [day({ day: 1, holidayName: 'Quốc khánh', shift: someShift })];
    const totals = summarizeAssignmentRow(days);
    expect(
      totals.assignedDays +
        totals.holidayDays +
        totals.offDays +
        totals.unassignedWorkingDays +
        totals.outOfWindowDays,
    ).toBe(days.length);
  });

  /*
   * Ca VH2 19:30–07:30 bắt đầu ngày N và kết thúc sáng ngày N+1. Ngày N+1 đã
   * có người trực suốt buổi sáng, nên báo "chưa phân ca" là bảo HR đi phân ca
   * cho một ngày đã kín lịch — với ca 24 giờ thì càng vô lý.
   */
  it('ngày sau ca qua đêm không bị tính là chưa phân ca', () => {
    const overnight = {
      ...someShift,
      code: 'VH2',
      startTime: '19:30',
      endTime: '07:30',
      dayValue: 1.5,
    };
    const totals = summarizeAssignmentRow([
      day({ day: 1, shift: overnight }),
      day({ day: 2, shift: null, isWorkingDay: true }),
    ]);
    expect(totals.unassignedWorkingDays).toBe(0);
    expect(totals.offDays).toBe(1);
    expect(totals.assignedDays).toBe(1);
  });

  it('ngày sau ca TRONG NGÀY vẫn phải báo chưa phân ca', () => {
    const dayShift = {
      ...someShift,
      code: 'VH1',
      startTime: '07:30',
      endTime: '19:30',
    };
    const totals = summarizeAssignmentRow([
      day({ day: 1, shift: dayShift }),
      day({ day: 2, shift: null, isWorkingDay: true }),
    ]);
    expect(totals.unassignedWorkingDays).toBe(1);
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

describe('countRosterMismatch', () => {
  it('không báo lệch khi vừa có ca vừa ở trong BCC', () => {
    expect(
      countRosterMismatch([
        { includedInTimesheet: true, canInclude: true, assignedDays: 20 },
      ]),
    ).toEqual({ assignedNotInTimesheet: 0, inTimesheetWithoutShift: 0 });
  });

  it('đếm người đã phân ca nhưng chưa vào BCC', () => {
    expect(
      countRosterMismatch([
        { includedInTimesheet: false, canInclude: true, assignedDays: 20 },
      ]),
    ).toEqual({ assignedNotInTimesheet: 1, inTimesheetWithoutShift: 0 });
  });

  it('đếm người đã vào BCC nhưng chưa có ca nào', () => {
    expect(
      countRosterMismatch([
        { includedInTimesheet: true, canInclude: true, assignedDays: 0 },
      ]),
    ).toEqual({ assignedNotInTimesheet: 0, inTimesheetWithoutShift: 1 });
  });

  it('bỏ qua người chưa đủ điều kiện vào BCC dù chưa có ca', () => {
    expect(
      countRosterMismatch([
        { includedInTimesheet: true, canInclude: false, assignedDays: 0 },
      ]),
    ).toEqual({ assignedNotInTimesheet: 0, inTimesheetWithoutShift: 0 });
  });

  it('không báo lệch với người vừa không có ca vừa không ở BCC', () => {
    expect(
      countRosterMismatch([
        { includedInTimesheet: false, canInclude: true, assignedDays: 0 },
      ]),
    ).toEqual({ assignedNotInTimesheet: 0, inTimesheetWithoutShift: 0 });
  });

  it('đếm được cả hai nhóm trong cùng một danh sách', () => {
    expect(
      countRosterMismatch([
        { includedInTimesheet: false, canInclude: true, assignedDays: 20 },
        { includedInTimesheet: false, canInclude: true, assignedDays: 15 },
        { includedInTimesheet: true, canInclude: true, assignedDays: 0 },
        { includedInTimesheet: true, canInclude: true, assignedDays: 22 },
      ]),
    ).toEqual({ assignedNotInTimesheet: 2, inTimesheetWithoutShift: 1 });
  });

  it('danh sách rỗng thì không có gì để báo', () => {
    expect(countRosterMismatch([])).toEqual({
      assignedNotInTimesheet: 0,
      inTimesheetWithoutShift: 0,
    });
  });
});

/*
 * Tư duy ngược: ép hàm tổng vào các tình huống dữ liệu dễ sai nhất thay vì chỉ
 * chạy dữ liệu đẹp.
 */
describe('summarizeAssignmentRow — dữ liệu bất thường', () => {
  const overnight = {
    ...someShift,
    code: 'VH2',
    startTime: '19:30',
    endTime: '07:30',
    dayValue: 1.5,
  };

  it('không phụ thuộc thứ tự ngày trong mảng', () => {
    // API hiện trả mảng đã sắp xếp, nhưng logic đuôi ca đêm không được gãy chỉ
    // vì tầng trên lọc hay sắp xếp lại.
    const totals = summarizeAssignmentRow([
      day({ day: 3, shift: null, isWorkingDay: true }),
      day({ day: 2, shift: overnight }),
    ]);
    expect(totals.unassignedWorkingDays).toBe(0);
    expect(totals.offDays).toBe(1);
  });

  it('ca thiếu giờ vào/ra thì không đoán là ca qua đêm', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, shift: { ...someShift, startTime: null, endTime: null } }),
      day({ day: 2, shift: null, isWorkingDay: true }),
    ]);
    // Không suy được thì giữ nguyên cảnh báo, thà báo thừa còn hơn giấu việc.
    expect(totals.unassignedWorkingDays).toBe(1);
  });

  it('ca thiếu dayValue vẫn được tính 1 công, không bị bỏ khỏi tổng', () => {
    const totals = summarizeAssignmentRow([
      day({ day: 1, shift: { ...someShift, code: 'LA', dayValue: null } }),
    ]);
    expect(totals.workDays).toBe(1);
  });
});
