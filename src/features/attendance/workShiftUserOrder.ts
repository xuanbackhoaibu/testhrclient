import { getStoredString, setStoredString } from "../../shared/utils/storage";
import { compareWorkShiftCatalog } from "./workShiftCatalogOrder";
import type { CodeSortable } from "../../shared/utils/sort";

/**
 * Thứ tự ca do từng HR tự kéo sắp trong bảng chọn ca.
 *
 * Lưu ở localStorage theo user chứ không vào DB: đây là tuỳ chọn hiển thị cá
 * nhân, mỗi HR quen một thứ tự khác nhau và không ai được đổi thứ tự của người
 * khác. Lưu theo `code` chứ không theo `id` để thứ tự giữ nguyên khi danh mục
 * ca được tạo lại giữa các môi trường.
 */
const ORDER_KEY_PREFIX = "hr-web-client.workShiftOrder";

function storageKey(userId: string | null | undefined): string {
  return `${ORDER_KEY_PREFIX}.${userId ?? "anonymous"}`;
}

function normalizeCode(code: string | number | null | undefined): string {
  return String(code ?? "")
    .trim()
    .toUpperCase();
}

/** Đọc thứ tự đã lưu; trả về mảng rỗng nếu chưa có hoặc dữ liệu hỏng. */
export function readWorkShiftUserOrder(
  userId: string | null | undefined,
): string[] {
  const raw = getStoredString(storageKey(userId));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((code): code is string => typeof code === "string")
      .map(normalizeCode)
      .filter(Boolean);
  } catch {
    // Dữ liệu hỏng thì coi như chưa sắp, rơi về thứ tự danh mục mặc định.
    return [];
  }
}

export function writeWorkShiftUserOrder(
  userId: string | null | undefined,
  codes: readonly string[],
): void {
  try {
    setStoredString(
      storageKey(userId),
      JSON.stringify(codes.map(normalizeCode).filter(Boolean)),
    );
  } catch {
    // Hết quota hoặc localStorage bị chặn — bỏ qua, thứ tự chỉ là tuỳ chọn hiển thị.
  }
}

/**
 * Sắp ca theo thứ tự người dùng đã kéo. Ca chưa có trong thứ tự đã lưu (ca mới
 * thêm sau lần kéo gần nhất) luôn đứng sau và giữ thứ tự danh mục mặc định, nên
 * ca mới không bao giờ chen vào giữa phần HR đã sắp tay.
 */
export function sortWorkShiftsByUserOrder<T extends CodeSortable>(
  shifts: readonly T[] | null | undefined,
  order: readonly string[],
): T[] {
  const rank = new Map(order.map((code, index) => [normalizeCode(code), index]));
  return [...(shifts ?? [])].sort((left, right) => {
    const leftRank = rank.get(normalizeCode(left.code));
    const rightRank = rank.get(normalizeCode(right.code));
    if (leftRank !== undefined && rightRank !== undefined) {
      return leftRank - rightRank;
    }
    if (leftRank !== undefined) return -1;
    if (rightRank !== undefined) return 1;
    return compareWorkShiftCatalog(left, right);
  });
}

/** Di chuyển phần tử từ vị trí `from` tới `to`, trả về mảng mới. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (
    from < 0 ||
    to < 0 ||
    from >= next.length ||
    to >= next.length ||
    from === to
  ) {
    return next;
  }
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
