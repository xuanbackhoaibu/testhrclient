import { describe, expect, it } from 'vitest';

import {
  isReplacingShift,
  resolveTimesheetCellEditAction,
} from './timesheetCellEdit';

const base = {
  currentShiftId: 'shift-s1',
  selectedShiftId: 'shift-s1',
  reason: 'Nhân viên đi làm cả ngày',
  unitId: 'unit-1',
};

describe('resolveTimesheetCellEditAction', () => {
  it('chọn ca khác → đổi ca, không sửa tay ký hiệu', () => {
    expect(
      resolveTimesheetCellEditAction({
        ...base,
        selectedShiftId: 'shift-hc1',
      }),
    ).toEqual({ kind: 'REPLACE_SHIFT', shiftId: 'shift-hc1' });
  });

  it('giữ nguyên ca → sửa tay ký hiệu', () => {
    expect(resolveTimesheetCellEditAction(base)).toEqual({
      kind: 'ADJUST_SYMBOL',
    });
  });

  /*
   * Chọn trùng ca đang có là thao tác vô nghĩa: gọi API sẽ tạo một ca cá nhân
   * thừa cho đúng ngày đó, làm bẩn lịch phân ca.
   */
  it('chọn trùng ca hiện tại không tính là đổi ca', () => {
    expect(
      resolveTimesheetCellEditAction({
        ...base,
        selectedShiftId: base.currentShiftId,
      }),
    ).toEqual({ kind: 'ADJUST_SYMBOL' });
  });

  it('đổi ca KHÔNG bắt buộc nêu lý do', () => {
    expect(
      resolveTimesheetCellEditAction({
        ...base,
        selectedShiftId: 'shift-hc1',
        reason: '',
      }),
    ).toEqual({ kind: 'REPLACE_SHIFT', shiftId: 'shift-hc1' });
  });

  it.each(['', '  ', 'ab'])(
    'sửa tay ký hiệu mà lý do là "%s" thì bị chặn',
    (reason) => {
      expect(resolveTimesheetCellEditAction({ ...base, reason })).toEqual({
        kind: 'BLOCKED',
        reason: 'MISSING_REASON',
      });
    },
  );

  it('đổi ca mà dòng chưa có đơn vị thì chặn với thông báo riêng', () => {
    expect(
      resolveTimesheetCellEditAction({
        ...base,
        selectedShiftId: 'shift-hc1',
        unitId: null,
      }),
    ).toEqual({ kind: 'BLOCKED', reason: 'MISSING_UNIT' });
  });

  it('ô chưa có ca mà chọn ca thì vẫn là đổi ca', () => {
    // Backend tự từ chối nếu ngày đó không có ca để đổi; UI không đoán thay.
    expect(
      resolveTimesheetCellEditAction({
        ...base,
        currentShiftId: null,
        selectedShiftId: 'shift-hc1',
      }),
    ).toEqual({ kind: 'REPLACE_SHIFT', shiftId: 'shift-hc1' });
  });
});

describe('isReplacingShift', () => {
  it.each([
    ['shift-s1', 'shift-hc1', true],
    ['shift-s1', 'shift-s1', false],
    ['shift-s1', null, false],
    [null, 'shift-hc1', true],
    [null, null, false],
  ])('ca hiện tại %s, chọn %s → %s', (current, selected, expected) => {
    expect(isReplacingShift(current, selected)).toBe(expected);
  });
});
