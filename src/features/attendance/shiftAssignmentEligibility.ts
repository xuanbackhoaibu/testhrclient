import { formatWorkingMinutes } from './shiftDuration';
import type { WorkShift } from './workScheduleTypes';

/**
 * Lý do một ca không thể chọn để phân trực tiếp trên ô ngày, hoặc null nếu chọn được.
 *
 * Ca qua ngày (18:30–06:30, hay 07:30–07:30) phân ca được: bộ tính công phía API
 * quy mốc sau nửa đêm về ngày hôm sau trước khi trừ, nên chỉ còn trạng thái ca là
 * điều kiện chặn. Trước đây frontend còn chặn thêm bằng startTime >= endTime kèm
 * nhãn "Chưa phân ca qua ngày", khiến ca bật ĐANG LÀM VIỆC mà vẫn không phân được.
 */
export function directCellShiftDisabledReason(shift: WorkShift): string | null {
  return shift.status === 'ACTIVE' ? null : 'Ca đang tạm ngưng';
}

/**
 * Nhãn "giờ công / số công" của một ca trong danh sách chọn ca.
 *
 * Dùng formatWorkingMinutes thay vì chia 60 rồi toFixed(1): cách cũ hiện ca 11h50
 * thành "11.8 giờ", đọc ra 11h48 — lệch 2 phút so với thực tế.
 */
export function formatShiftHoursAndWorkday(shift: WorkShift): string {
  return `${formatWorkingMinutes(shift.standardMinutes)} / ${shift.dayValue} công`;
}
