/**
 * Tính vị trí đích của một lần kéo thả trong danh sách sắp thứ tự.
 *
 * Chỗ dễ sai nhất là lệch một bậc: chỉ số đích được hiểu trên danh sách ĐÃ bỏ
 * người bị kéo ra, nên khi kéo xuống phải lùi thêm một bậc. Tách khỏi
 * component để kiểm được bằng test thay vì phải kéo tay từng trường hợp.
 */
export type DropSide = "above" | "below";

/** null = không cần làm gì (thả lại đúng chỗ cũ, hoặc dữ liệu không hợp lệ). */
export function resolveDropIndex(
  employeeIds: readonly string[],
  movedEmployeeId: string,
  overEmployeeId: string,
  side: DropSide,
): number | null {
  const fromIndex = employeeIds.indexOf(movedEmployeeId);
  const overIndex = employeeIds.indexOf(overEmployeeId);
  if (fromIndex === -1 || overIndex === -1) return null;
  if (movedEmployeeId === overEmployeeId) return null;

  let toIndex = side === "above" ? overIndex : overIndex + 1;
  if (fromIndex < toIndex) toIndex -= 1;
  return toIndex === fromIndex ? null : toIndex;
}

/**
 * Áp một lần kéo lên danh sách — dùng cho cập nhật lạc quan ở client, phải cho
 * ra đúng thứ tự mà server sẽ trả về sau đó. Nếu hai bên lệch nhau thì danh
 * sách sẽ nhảy một nhịp khi phản hồi về, đúng cảm giác "giật" cần tránh.
 */
export function applyMove<T>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (fromIndex < 0 || fromIndex >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, moved);
  return next;
}
