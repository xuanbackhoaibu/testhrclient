import { describe, expect, it } from "vitest";

import {
  getWorkShiftCatalogOrder,
  sortWorkShiftCatalog,
  WORK_SHIFT_CATALOG_CODES,
} from "./workShiftCatalogOrder";

describe("work shift catalogue order", () => {
  it("keeps the 22 HR shift codes in their approved order", () => {
    expect(WORK_SHIFT_CATALOG_CODES).toHaveLength(22);
    expect(getWorkShiftCatalogOrder("HC1")).toBe(1);
    expect(getWorkShiftCatalogOrder(" hc4 ")).toBe(4);
    expect(getWorkShiftCatalogOrder("BV6")).toBe(22);
    expect(getWorkShiftCatalogOrder("HC")).toBeNull();
  });

  it("puts canonical shifts first and custom shifts after them naturally", () => {
    const shifts = [
      { code: "X10", name: "Ca X 10" },
      { code: "BV6", name: "Bảo vệ 6" },
      { code: "HC4", name: "Hành chính thứ 7" },
      { code: "X2", name: "Ca X 2" },
      { code: "HC1", name: "Hành chính 1" },
      { code: null, name: "Chưa có mã" },
    ];

    expect(sortWorkShiftCatalog(shifts).map((shift) => shift.code)).toEqual([
      "HC1",
      "HC4",
      "BV6",
      "X2",
      "X10",
      null,
    ]);
    expect(shifts.map((shift) => shift.code)).toEqual([
      "X10",
      "BV6",
      "HC4",
      "X2",
      "HC1",
      null,
    ]);
  });
});

/*
 * Ô chọn ca trong hộp thoại "Sửa ô" của Bảng công tháng đọc thẳng từ API, vốn
 * trả theo mã tăng dần — `C1` nhảy lên trước `HC1`, đọc ngược hẳn với màn Ca
 * làm việc và Phân ca. Neo lại đúng thứ tự HR đang nhìn thấy.
 */
describe("thứ tự danh mục ca hiển thị cho HR", () => {
  it("giữ đúng nhóm HC → S → C → VH → BV, ca tự tạo xếp cuối", () => {
    const shifts = [
      "C1",
      "C2",
      "C3",
      "HC-VPTCT-082026",
      "HC1",
      "HC2",
      "HC3",
      "S1",
      "VH2",
      "BV1",
    ].map((code) => ({ code }));

    expect(sortWorkShiftCatalog(shifts).map((shift) => shift.code)).toEqual([
      "HC1",
      "HC2",
      "HC3",
      "S1",
      "C1",
      "C2",
      "C3",
      "VH2",
      "BV1",
      // Ca do HR tự tạo không nằm trong bảng 22 ca chuẩn.
      "HC-VPTCT-082026",
    ]);
  });
});
