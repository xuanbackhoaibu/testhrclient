import { describe, expect, it } from "vitest";

import { moveItem, sortWorkShiftsByUserOrder } from "./workShiftUserOrder";

const shift = (code: string) => ({ code });

describe("sortWorkShiftsByUserOrder", () => {
  it("giữ thứ tự danh mục mặc định khi người dùng chưa kéo sắp", () => {
    const shifts = [shift("S1"), shift("HC1"), shift("BV1")];
    expect(sortWorkShiftsByUserOrder(shifts, []).map((s) => s.code)).toEqual([
      "HC1",
      "S1",
      "BV1",
    ]);
  });

  it("sắp theo đúng thứ tự người dùng đã lưu", () => {
    const shifts = [shift("HC1"), shift("S1"), shift("BV1")];
    const order = ["BV1", "HC1", "S1"];
    expect(sortWorkShiftsByUserOrder(shifts, order).map((s) => s.code)).toEqual([
      "BV1",
      "HC1",
      "S1",
    ]);
  });

  it("đẩy ca chưa có trong thứ tự đã lưu xuống cuối, không chen vào giữa", () => {
    const shifts = [shift("HC1"), shift("S1"), shift("MOI-01")];
    const order = ["S1", "HC1"];
    expect(sortWorkShiftsByUserOrder(shifts, order).map((s) => s.code)).toEqual([
      "S1",
      "HC1",
      "MOI-01",
    ]);
  });

  it("bỏ qua mã trong thứ tự đã lưu mà ca không còn tồn tại", () => {
    const shifts = [shift("HC1"), shift("S1")];
    const order = ["DA-XOA", "S1", "HC1"];
    expect(sortWorkShiftsByUserOrder(shifts, order).map((s) => s.code)).toEqual([
      "S1",
      "HC1",
    ]);
  });

  it("khớp mã không phân biệt hoa thường", () => {
    const shifts = [shift("HC1"), shift("S1")];
    expect(
      sortWorkShiftsByUserOrder(shifts, ["s1", "hc1"]).map((s) => s.code),
    ).toEqual(["S1", "HC1"]);
  });

  it("không làm thay đổi mảng gốc", () => {
    const shifts = [shift("S1"), shift("HC1")];
    sortWorkShiftsByUserOrder(shifts, ["HC1", "S1"]);
    expect(shifts.map((s) => s.code)).toEqual(["S1", "HC1"]);
  });
});

describe("moveItem", () => {
  it("kéo một phần tử lên trên", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("kéo một phần tử xuống dưới", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("trả về mảng không đổi khi chỉ số nằm ngoài phạm vi hoặc trùng nhau", () => {
    expect(moveItem(["a", "b"], 0, 0)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], -1, 1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });

  it("không làm thay đổi mảng gốc", () => {
    const items = ["a", "b", "c"];
    moveItem(items, 0, 2);
    expect(items).toEqual(["a", "b", "c"]);
  });
});
