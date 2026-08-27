/**
 * Quyết định hộp thoại "Sửa ô" của Bảng công tháng sẽ làm gì khi bấm Lưu.
 *
 * Ô này gộp hai thao tác khác hẳn nhau về bản chất:
 *
 *  - **Đổi ca** — HR chốt (21/08/2026): ca đã phân là căn cứ tính công, lệch
 *    thực tế thì SỬA CA chứ không sửa cách tính. Hệ thống vẫn tự tính lại.
 *  - **Sửa tay ký hiệu** — ghi đè quyết định của bộ tính và KHÓA ô khỏi job
 *    (`hasAdjustment = true`), nên bắt buộc nêu lý do.
 *
 * Hai việc này loại trừ nhau: đổi ca xong mà vẫn chốt cứng ký hiệu cũ thì ca
 * mới vô nghĩa — bấm "Cập nhật bảng công" cũng không tính lại được ô đó nữa.
 */
export type TimesheetCellEditAction =
  | { kind: 'REPLACE_SHIFT'; shiftId: string }
  | { kind: 'ADJUST_SYMBOL' }
  | { kind: 'BLOCKED'; reason: 'MISSING_REASON' | 'MISSING_UNIT' };

export interface TimesheetCellEditInput {
  /** Ca đang áp dụng cho ô; null khi ngày đó chưa phân ca. */
  currentShiftId: string | null;
  /** Ca HR vừa chọn trong hộp thoại. */
  selectedShiftId: string | null;
  /** Lý do sửa tay, đã trim hay chưa đều được. */
  reason: string;
  /** Đơn vị của dòng — API đổi ca cần để xác định kỳ phân ca. */
  unitId: string | null;
}

/** Lý do sửa tay phải đủ nghĩa để đối chiếu khi có khiếu nại. */
const MIN_REASON_LENGTH = 3;

export function resolveTimesheetCellEditAction({
  currentShiftId,
  selectedShiftId,
  reason,
  unitId,
}: TimesheetCellEditInput): TimesheetCellEditAction {
  const shiftChanged =
    selectedShiftId !== null && selectedShiftId !== currentShiftId;

  if (shiftChanged) {
    // Không có đơn vị thì không dựng được payload đổi ca; báo rõ thay vì gọi
    // API rồi nhận lỗi khó hiểu.
    if (!unitId) return { kind: 'BLOCKED', reason: 'MISSING_UNIT' };
    return { kind: 'REPLACE_SHIFT', shiftId: selectedShiftId };
  }

  if (reason.trim().length < MIN_REASON_LENGTH) {
    return { kind: 'BLOCKED', reason: 'MISSING_REASON' };
  }
  return { kind: 'ADJUST_SYMBOL' };
}

/**
 * Đang trong trạng thái đổi ca — dùng để khóa các ô ký hiệu / số công / lý do.
 *
 * Để chúng mở khi đổi ca sẽ khiến HR tưởng cả hai cùng được áp dụng, trong khi
 * chỉ ca mới có hiệu lực.
 */
export function isReplacingShift(
  currentShiftId: string | null,
  selectedShiftId: string | null,
): boolean {
  return selectedShiftId !== null && selectedShiftId !== currentShiftId;
}
