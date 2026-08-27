/**
 * Chọn CBNV để phân ca hàng loạt.
 *
 * Lưới phân ca phân trang 20/50/100 dòng, trong khi HR thường phân ca cho cả
 * đơn vị hoặc cả phòng ban một lần. Nếu "chọn tất cả" chỉ tick được trang
 * đang xem thì với 419 CBNV, HR phải lật 21 trang và rất dễ sót người —
 * người bị sót không có ca, BCC hiện "chưa phân ca" mà không ai biết.
 *
 * Phạm vi chọn vì thế bám theo BỘ LỌC (đơn vị + phòng ban + tìm kiếm) chứ
 * không theo trang: đúng bằng những gì HR đang nhìn thấy.
 */

/** Chỉ CBNV được phép đưa vào BCC mới phân ca được. */
export interface SelectableEmployeeRow {
  employeeId: string;
  canInclude: boolean;
}

/** Lọc ra những dòng thực sự phân ca được trong phạm vi đang xem. */
export function selectableEmployeeRows<T extends SelectableEmployeeRow>(
  rows: readonly T[],
): T[] {
  return rows.filter((row) => row.canInclude);
}

/** Id của toàn bộ CBNV đang lọc — dùng cho nút "Chọn tất cả". */
export function allSelectableEmployeeIds(
  rows: readonly SelectableEmployeeRow[],
): Set<string> {
  return new Set(selectableEmployeeRows(rows).map((row) => row.employeeId));
}

/**
 * Đã chọn hết CBNV trong phạm vi lọc chưa — để tắt nút "Chọn tất cả" khi
 * không còn gì để chọn thêm.
 *
 * Danh sách rỗng KHÔNG tính là đã chọn hết: không có ai để chọn thì nút phải
 * tắt vì rỗng, không phải vì đã xong.
 */
export function hasSelectedAllFiltered(
  rows: readonly SelectableEmployeeRow[],
  selectedEmployeeIds: ReadonlySet<string>,
): boolean {
  const selectable = selectableEmployeeRows(rows);
  return (
    selectable.length > 0 &&
    selectable.every((row) => selectedEmployeeIds.has(row.employeeId))
  );
}
