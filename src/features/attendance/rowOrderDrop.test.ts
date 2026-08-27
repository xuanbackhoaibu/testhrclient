import { describe, expect, it } from "vitest";

import { applyMove, resolveDropIndex } from "./rowOrderDrop";

const list = ["a", "b", "c", "d"];

describe("resolveDropIndex — vị trí đích khi thả", () => {
  it("kéo lên trên một dòng, thả nửa trên", () => {
    // c lên trước b → vị trí 1
    expect(resolveDropIndex(list, "c", "b", "above")).toBe(1);
  });

  it("kéo lên đầu danh sách", () => {
    expect(resolveDropIndex(list, "d", "a", "above")).toBe(0);
  });

  /*
   * Kéo xuống là chỗ dễ lệch một bậc nhất: sau khi bỏ phần tử được kéo ra,
   * mọi chỉ số phía sau đều tụt một bậc.
   */
  it("kéo xuống dưới, thả nửa dưới của dòng cuối", () => {
    expect(resolveDropIndex(list, "a", "d", "below")).toBe(3);
  });

  it("kéo xuống một bậc", () => {
    // a xuống sau b → vẫn là vị trí 1 sau khi a bị bỏ ra
    expect(resolveDropIndex(list, "a", "b", "below")).toBe(1);
  });

  it("thả nửa trên của dòng ngay dưới mình = không đổi chỗ", () => {
    expect(resolveDropIndex(list, "a", "b", "above")).toBeNull();
  });

  it("thả nửa dưới của dòng ngay trên mình = không đổi chỗ", () => {
    expect(resolveDropIndex(list, "b", "a", "below")).toBeNull();
  });

  it("thả lên chính mình thì bỏ qua", () => {
    expect(resolveDropIndex(list, "b", "b", "above")).toBeNull();
  });

  it("bỏ qua khi id không có trong danh sách", () => {
    expect(resolveDropIndex(list, "khong-co", "a", "above")).toBeNull();
    expect(resolveDropIndex(list, "a", "khong-co", "above")).toBeNull();
  });

  /*
   * Bảo đảm tổng quát: áp kết quả vào mảng thật thì phần tử được kéo phải nằm
   * đúng chỗ mong đợi, với MỌI cặp vị trí và cả hai phía thả.
   */
  it("mọi cặp vị trí đều cho kết quả khớp với thao tác người dùng thấy", () => {
    for (let from = 0; from < list.length; from++) {
      for (let over = 0; over < list.length; over++) {
        for (const side of ["above", "below"] as const) {
          const moved = list[from];
          const overId = list[over];
          const toIndex = resolveDropIndex(list, moved, overId, side);
          if (toIndex === null) continue;

          const next = [...list];
          next.splice(from, 1);
          next.splice(toIndex, 0, moved);

          const landedAt = next.indexOf(moved);
          const neighbourAt = next.indexOf(overId);
          // Thả nửa trên thì đứng NGAY TRƯỚC dòng đó, nửa dưới thì NGAY SAU.
          expect(landedAt).toBe(
            side === "above" ? neighbourAt - 1 : neighbourAt + 1,
          );
        }
      }
    }
  });
});

describe("applyMove — cập nhật lạc quan khớp với server", () => {
  it("đưa phần tử tới đúng vị trí đích", () => {
    expect(applyMove(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(applyMove(list, 0, 3)).toEqual(["b", "c", "d", "a"]);
  });

  it("kẹp chỉ số vượt phạm vi về cuối danh sách", () => {
    expect(applyMove(list, 0, 99)).toEqual(["b", "c", "d", "a"]);
  });

  it("không đổi gì khi chỉ số nguồn không hợp lệ", () => {
    expect(applyMove(list, -1, 0)).toEqual(list);
    expect(applyMove(list, 99, 0)).toEqual(list);
  });

  it("không sửa mảng gốc", () => {
    const original = [...list];
    applyMove(list, 0, 2);
    expect(list).toEqual(original);
  });

  /*
   * Đây là bảo đảm then chốt: kết quả hiển thị ngay dưới ngón tay phải TRÙNG
   * với thứ tự server tính ra từ cùng toIndex. Lệch nhau thì danh sách sẽ nhảy
   * một nhịp khi phản hồi về.
   */
  it("khớp với kết quả suy ra từ resolveDropIndex ở mọi trường hợp", () => {
    for (let from = 0; from < list.length; from++) {
      for (let over = 0; over < list.length; over++) {
        for (const side of ["above", "below"] as const) {
          const toIndex = resolveDropIndex(list, list[from], list[over], side);
          if (toIndex === null) continue;
          expect(applyMove(list, from, toIndex)).toEqual(
            (() => {
              const expected = [...list];
              const [moved] = expected.splice(from, 1);
              expected.splice(toIndex, 0, moved);
              return expected;
            })(),
          );
        }
      }
    }
  });
});
