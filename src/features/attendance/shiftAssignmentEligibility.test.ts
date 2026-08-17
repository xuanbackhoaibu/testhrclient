import { describe, expect, it } from 'vitest';

import {
  directCellShiftDisabledReason,
  formatShiftHoursAndWorkday,
} from './shiftAssignmentEligibility';
import type { WorkShift } from './workScheduleTypes';

/**
 * Ca qua ngày từng bị frontend chặn phân ca bằng điều kiện startTime >= endTime,
 * kèm nhãn "Chưa phân ca qua ngày". Bộ tính công phía API đã hỗ trợ ca qua đêm
 * (hr-api-service 9529217: quy mốc sau nửa đêm về ngày hôm sau) và commit đó ghi
 * rõ "bỏ chặn tạo/bật/phân ca qua đêm", nhưng phần chặn ở frontend chưa được gỡ.
 * Hệ quả: ca bật được ĐANG LÀM VIỆC mà vẫn không phân ca được.
 *
 * Các ca dưới đây lấy đúng từ danh mục thật để khỏi hồi quy lần nữa.
 */
function shift(over: Partial<WorkShift>): WorkShift {
  return {
    id: 'id',
    code: 'X',
    name: 'Ca',
    groupName: 'Nhà máy',
    startTime: '08:00',
    endTime: '17:00',
    standardMinutes: 480,
    dayValue: 1,
    status: 'ACTIVE',
    ...over,
  } as WorkShift;
}

describe('directCellShiftDisabledReason', () => {
  it('cho phân ca ca ngày thường (BV1 06:10–18:00)', () => {
    expect(
      directCellShiftDisabledReason(
        shift({ code: 'BV1', startTime: '06:10', endTime: '18:00' }),
      ),
    ).toBeNull();
  });

  it('cho phân ca ca đêm qua ngày (VH2 19:30–07:30)', () => {
    expect(
      directCellShiftDisabledReason(
        shift({ code: 'VH2', startTime: '19:30', endTime: '07:30' }),
      ),
    ).toBeNull();
  });

  it('cho phân ca ca đêm qua ngày (BV2 18:10–06:00)', () => {
    expect(
      directCellShiftDisabledReason(
        shift({ code: 'BV2', startTime: '18:10', endTime: '06:00' }),
      ),
    ).toBeNull();
  });

  it('cho phân ca ca ngày đêm qua ngày (BV3 06:10–06:00)', () => {
    expect(
      directCellShiftDisabledReason(
        shift({ code: 'BV3', startTime: '06:10', endTime: '06:00' }),
      ),
    ).toBeNull();
  });

  it('cho phân ca ca 24 tiếng vào bằng giờ tan (VH3 07:30–07:30)', () => {
    expect(
      directCellShiftDisabledReason(
        shift({
          code: 'VH3',
          startTime: '07:30',
          endTime: '07:30',
          standardMinutes: 1440,
          dayValue: 3,
        }),
      ),
    ).toBeNull();
  });

  it('vẫn chặn ca tạm ngưng, dù là ca ngày', () => {
    expect(
      directCellShiftDisabledReason(
        shift({ code: 'BV4', status: 'INACTIVE' }),
      ),
    ).toBe('Ca đang tạm ngưng');
  });

  it('vẫn chặn ca tạm ngưng khi là ca qua ngày (BV5 18:30–06:30)', () => {
    expect(
      directCellShiftDisabledReason(
        shift({
          code: 'BV5',
          startTime: '18:30',
          endTime: '06:30',
          status: 'INACTIVE',
        }),
      ),
    ).toBe('Ca đang tạm ngưng');
  });

  it('không còn trả lý do "Chưa phân ca qua ngày" cho bất kỳ ca đang hoạt động', () => {
    const overnightShifts = [
      { code: 'VH2', startTime: '19:30', endTime: '07:30' },
      { code: 'VH3', startTime: '07:30', endTime: '07:30' },
      { code: 'BV2', startTime: '18:10', endTime: '06:00' },
      { code: 'BV3', startTime: '06:10', endTime: '06:00' },
      { code: 'BV6', startTime: '06:30', endTime: '06:30' },
    ];
    for (const over of overnightShifts) {
      expect(directCellShiftDisabledReason(shift(over))).not.toBe(
        'Chưa phân ca qua ngày',
      );
    }
  });
});

describe('formatShiftHoursAndWorkday', () => {
  it('ca tròn giờ hiện số giờ gọn (BV1 12 giờ / 1 công)', () => {
    expect(
      formatShiftHoursAndWorkday(
        shift({ standardMinutes: 720, dayValue: 1 }),
      ),
    ).toBe('12 giờ / 1 công');
  });

  // Trước đây chia 60 rồi toFixed(1) nên BV2 hiện "11.8 giờ" — đọc ra 11h48,
  // lệch 2 phút so với 11h50 thật; BV3 hiện "23.8 giờ" thay vì 23h50.
  it('ca lẻ phút hiện giờ và phút, không hiện 11.8 giờ (BV2)', () => {
    expect(
      formatShiftHoursAndWorkday(
        shift({ standardMinutes: 710, dayValue: 1 }),
      ),
    ).toBe('11 giờ 50 phút / 1 công');
  });

  it('ca lẻ phút hiện giờ và phút, không hiện 23.8 giờ (BV3)', () => {
    expect(
      formatShiftHoursAndWorkday(
        shift({ standardMinutes: 1430, dayValue: 2 }),
      ),
    ).toBe('23 giờ 50 phút / 2 công');
  });

  it('ca 24 tiếng giữ nguyên 24 giờ và số công nhiều hơn 1 (VH3)', () => {
    expect(
      formatShiftHoursAndWorkday(
        shift({ standardMinutes: 1440, dayValue: 3 }),
      ),
    ).toBe('24 giờ / 3 công');
  });
});
