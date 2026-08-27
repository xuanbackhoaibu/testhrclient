import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../../shared/api/httpClient', () => ({ api: { get } }));

import { getAttendanceMappingStats } from './attendanceApi';

describe('getAttendanceMappingStats', () => {
  beforeEach(() => {
    get.mockReset();
  });

  /**
   * `api.get` đã bóc envelope, nên hàm này phải trả thẳng thứ nó nhận được.
   * Bóc thêm một lớp `.data` nữa sẽ ra undefined và 4 thẻ tổng ở trang
   * "Xử lý mapping" hiện dấu "—" dù bảng bên dưới vẫn có dữ liệu.
   */
  it('trả thẳng object thống kê, không bóc thêm lớp data', async () => {
    const stats = { total: 120, mapped: 80, autoMapped: 25, unmapped: 10, conflict: 5 };
    get.mockResolvedValue(stats);

    await expect(getAttendanceMappingStats()).resolves.toEqual(stats);
    expect(get).toHaveBeenCalledWith('/attendance/mapping/stats');
  });

  it('giữ nguyên số 0 thay vì biến thành undefined', async () => {
    const empty = { total: 0, mapped: 0, autoMapped: 0, unmapped: 0, conflict: 0 };
    get.mockResolvedValue(empty);

    await expect(getAttendanceMappingStats()).resolves.toEqual(empty);
  });
});
