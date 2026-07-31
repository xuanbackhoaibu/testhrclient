/**
 * Sắp xếp danh sách theo "mã" (code) tăng dần từ nhỏ tới lớn.
 *
 * Dùng natural sort (numeric-aware) nên các mã có số được sắp đúng theo giá trị:
 *   "1", "2", "10"  ->  thay vì  "1", "10", "2" (kiểu sắp chữ thông thường).
 * Vẫn xử lý được mã chữ-số như "PB01", "PB02", "PB10".
 */
const codeCollator = new Intl.Collator('vi', {
  numeric: true,
  sensitivity: 'base',
});

export interface CodeSortable {
  code?: string | number | null;
  name?: string | null;
  label?: string | null;
}

function normalizedCode(value: string | number | null | undefined): string | null {
  const code = String(value ?? '').trim();
  return code || null;
}

/** So sánh hai mã. Trả về < 0 nếu a đứng trước b. */
export function compareCode(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): number {
  // Giá trị rỗng/null luôn xếp xuống cuối.
  const normalizedA = normalizedCode(a);
  const normalizedB = normalizedCode(b);
  const aEmpty = normalizedA === null;
  const bEmpty = normalizedB === null;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return codeCollator.compare(normalizedA, normalizedB);
}

/** Natural business-code ordering with deterministic name fallback. */
export function compareByBusinessCode<T extends CodeSortable>(left: T, right: T): number {
  const codeResult = compareCode(left.code, right.code);
  if (codeResult !== 0) return codeResult;
  return codeCollator.compare(left.name ?? left.label ?? '', right.name ?? right.label ?? '');
}

/**
 * Trả về một mảng mới đã sắp xếp tăng dần theo mã.
 * Không làm thay đổi mảng gốc.
 *
 * @param items   Danh sách cần sắp.
 * @param getCode Hàm lấy ra mã từ mỗi phần tử. Mặc định lấy field `code`.
 */
export function sortByCode<T>(
  items: readonly T[] | null | undefined,
  getCode: (item: T) => string | number | null | undefined = (item) =>
    (item as { code?: string | number }).code,
): T[] {
  if (!items) return [];
  return [...items].sort((a, b) => {
    const codeResult = compareCode(getCode(a), getCode(b));
    if (codeResult !== 0) return codeResult;
    const left = a as CodeSortable;
    const right = b as CodeSortable;
    return codeCollator.compare(left.name ?? left.label ?? '', right.name ?? right.label ?? '');
  });
}
