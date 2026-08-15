import {
  compareByBusinessCode,
  type CodeSortable,
} from "../../shared/utils/sort";

/**
 * Thứ tự danh mục ca đã được HR chốt theo bảng ca gốc. Mã ngoài danh mục
 * này vẫn được hiển thị, nhưng luôn đứng sau để không làm xáo trộn thứ tự 22 ca
 * chuẩn khi HR bổ sung ca riêng.
 */
export const WORK_SHIFT_CATALOG_CODES = [
  "HC1",
  "HC2",
  "HC3",
  "HC4",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "C1",
  "C2",
  "C3",
  "VH1",
  "VH2",
  "VH3",
  "BV1",
  "BV2",
  "BV3",
  "BV4",
  "BV5",
  "BV6",
] as const;

export type WorkShiftCatalogCode = (typeof WORK_SHIFT_CATALOG_CODES)[number];

export const WORK_SHIFT_CATALOG_ORDER: Readonly<
  Record<WorkShiftCatalogCode, number>
> = Object.freeze(
  Object.fromEntries(
    WORK_SHIFT_CATALOG_CODES.map((code, index) => [code, index + 1]),
  ) as Record<WorkShiftCatalogCode, number>,
);

function normalizeCode(code: string | number | null | undefined): string {
  return String(code ?? "")
    .trim()
    .toUpperCase();
}

/** Returns the HR catalogue number (1–22), or null for a custom shift. */
export function getWorkShiftCatalogOrder(
  code: string | number | null | undefined,
): number | null {
  return (
    WORK_SHIFT_CATALOG_ORDER[normalizeCode(code) as WorkShiftCatalogCode] ??
    null
  );
}

/** Canonical HR shifts first; custom shifts retain the shared natural code order. */
export function compareWorkShiftCatalog<T extends CodeSortable>(
  left: T,
  right: T,
): number {
  const leftOrder = getWorkShiftCatalogOrder(left.code);
  const rightOrder = getWorkShiftCatalogOrder(right.code);

  if (leftOrder !== null && rightOrder !== null && leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  if (leftOrder !== null && rightOrder === null) return -1;
  if (leftOrder === null && rightOrder !== null) return 1;
  return compareByBusinessCode(left, right);
}

/** Returns a new array; never mutates the query cache result. */
export function sortWorkShiftCatalog<T extends CodeSortable>(
  shifts: readonly T[] | null | undefined,
): T[] {
  return [...(shifts ?? [])].sort(compareWorkShiftCatalog);
}
