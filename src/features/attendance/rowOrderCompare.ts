/**
 * So sánh hai dòng nhân sự theo thứ tự hiển thị chuẩn của phân hệ chấm công.
 *
 * Quy tắc chỉ có một chỗ duy nhất này, vì Bảng công tháng, Phân ca và file
 * Excel phải xếp giống hệt nhau — HR đối chiếu ba nơi cho cùng một phòng ban.
 * Trước đây mỗi màn tự so sánh riêng nên màn Phân ca bị bỏ sót khi thêm thứ
 * tự sắp tay.
 *
 * Thứ tự ưu tiên:
 *   1. Thứ tự HR sắp tay (màn Thứ tự nhân sự)
 *   2. Người chưa sắp xuống sau người đã sắp
 *   3. Mã chấm công gốc, so kiểu số tự nhiên
 *   4. Mã nhân sự HR — chỉ là tie-break ẩn, không bao giờ hiển thị thay mã
 *      chấm công
 */
export interface RowOrderIdentity {
  attendanceCode?: string | null;
  employeeCode: string;
  rowOrder?: number | null;
}

function normalizedCode(value: string | null | undefined): string | null {
  const code = value?.trim();
  return code ? code : null;
}

function compareCode(left: string, right: string): number {
  return left.localeCompare(right, "vi", {
    numeric: true,
    sensitivity: "base",
  });
}

export function compareRowOrder(
  left: RowOrderIdentity,
  right: RowOrderIdentity,
): number {
  const leftOrder = left.rowOrder ?? null;
  const rightOrder = right.rowOrder ?? null;
  if (leftOrder !== null && rightOrder !== null && leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  if (leftOrder !== null && rightOrder === null) return -1;
  if (leftOrder === null && rightOrder !== null) return 1;

  const leftCode = normalizedCode(left.attendanceCode);
  const rightCode = normalizedCode(right.attendanceCode);
  if (leftCode && rightCode) {
    const byAttendanceCode = compareCode(leftCode, rightCode);
    if (byAttendanceCode !== 0) return byAttendanceCode;
  } else if (leftCode) {
    // Người chưa gán mã chấm công luôn xuống cuối nhóm.
    return -1;
  } else if (rightCode) {
    return 1;
  }

  return compareCode(left.employeeCode, right.employeeCode);
}
