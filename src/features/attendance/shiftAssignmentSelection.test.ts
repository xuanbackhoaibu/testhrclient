import { describe, expect, it } from "vitest";

import {
  allSelectableEmployeeIds,
  hasSelectedAllFiltered,
  selectableEmployeeRows,
} from "./shiftAssignmentSelection";

const rows = [
  { employeeId: "e1", canInclude: true },
  { employeeId: "e2", canInclude: true },
  // Ngoài khoảng tính công của kỳ này — không phân ca được.
  { employeeId: "e3", canInclude: false },
];

describe("chọn CBNV để phân ca hàng loạt", () => {
  it("bỏ qua CBNV không đưa vào BCC được", () => {
    expect(selectableEmployeeRows(rows).map((row) => row.employeeId)).toEqual([
      "e1",
      "e2",
    ]);
  });

  it("chọn tất cả lấy trọn CBNV đang lọc, không riêng trang đang xem", () => {
    expect(allSelectableEmployeeIds(rows)).toEqual(new Set(["e1", "e2"]));
  });

  it("không tick nhầm người ngoài khoảng tính công", () => {
    expect(allSelectableEmployeeIds(rows).has("e3")).toBe(false);
  });

  it("biết khi đã chọn hết để tắt nút", () => {
    expect(hasSelectedAllFiltered(rows, new Set(["e1", "e2"]))).toBe(true);
    // e3 không chọn được nên không ảnh hưởng kết luận "đã chọn hết".
    expect(hasSelectedAllFiltered(rows, new Set(["e1"]))).toBe(false);
  });

  it("danh sách rỗng không tính là đã chọn hết", () => {
    // Nút phải tắt vì không có ai, không phải vì đã xong.
    expect(hasSelectedAllFiltered([], new Set())).toBe(false);
    expect(
      hasSelectedAllFiltered([{ employeeId: "e3", canInclude: false }], new Set()),
    ).toBe(false);
  });
});
