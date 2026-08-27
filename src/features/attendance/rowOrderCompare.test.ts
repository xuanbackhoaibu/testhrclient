import { describe, expect, it } from "vitest";

import { compareRowOrder } from "./rowOrderCompare";

const row = (
  attendanceCode: string | null,
  rowOrder: number | null = null,
  employeeCode = `HC${attendanceCode ?? "none"}`,
) => ({ attendanceCode, employeeCode, rowOrder });

/** Sắp một danh sách rồi trả về mã chấm công theo đúng thứ tự kết quả. */
function sortCodes(rows: ReturnType<typeof row>[]) {
  return [...rows].sort(compareRowOrder).map((item) => item.attendanceCode);
}

describe("compareRowOrder — quy tắc thứ tự dùng chung", () => {
  it("thứ tự HR sắp tay thắng mã chấm công", () => {
    expect(
      sortCodes([row("1", 3000), row("239", 1000), row("31", 2000)]),
    ).toEqual(["239", "31", "1"]);
  });

  it("người chưa sắp xuống sau người đã sắp", () => {
    expect(sortCodes([row("2", null), row("999", 1000)])).toEqual(["999", "2"]);
  });

  it("nhóm chưa sắp giữ đúng thứ tự mã chấm công kiểu số", () => {
    // "31" phải đứng trước "239" vì so theo số, không phải theo chuỗi.
    expect(sortCodes([row("239"), row("31"), row("2")])).toEqual([
      "2",
      "31",
      "239",
    ]);
  });

  it("mã có số 0 ở đầu vẫn so đúng theo giá trị số", () => {
    expect(sortCodes([row("31"), row("008"), row("2")])).toEqual([
      "2",
      "008",
      "31",
    ]);
  });

  it("người chưa gán mã chấm công xuống cuối nhóm", () => {
    expect(sortCodes([row(null), row("100"), row("5")])).toEqual([
      "5",
      "100",
      null,
    ]);
  });

  it("cùng thứ tự sắp tay thì so tiếp bằng mã chấm công", () => {
    expect(sortCodes([row("239", 1000), row("31", 1000)])).toEqual([
      "31",
      "239",
    ]);
  });

  it("hai người đều thiếu mã chấm công thì dùng mã nhân sự làm tie-break", () => {
    const rows = [row(null, null, "HC020"), row(null, null, "HC002")];
    expect(
      [...rows].sort(compareRowOrder).map((item) => item.employeeCode),
    ).toEqual(["HC002", "HC020"]);
  });

  it("rowOrder bằng 0 vẫn là đã sắp, không bị coi như chưa sắp", () => {
    // Kéo lên đầu danh sách có thể sinh sortOrder = 0; nếu bị hiểu nhầm thành
    // "chưa sắp" thì người vừa kéo lên đầu lại rơi xuống cuối.
    expect(sortCodes([row("5", null), row("999", 0)])).toEqual(["999", "5"]);
  });

  it("rowOrder undefined được coi như chưa sắp", () => {
    const withUndefined = { attendanceCode: "5", employeeCode: "HC5" };
    const sorted = [withUndefined, row("999", 1000)].sort(compareRowOrder);
    expect(sorted.map((item) => item.attendanceCode)).toEqual(["999", "5"]);
  });

  it("sắp xếp ổn định và đối xứng", () => {
    const a = row("10", 1000);
    const b = row("20", 2000);
    expect(compareRowOrder(a, b)).toBeLessThan(0);
    expect(compareRowOrder(b, a)).toBeGreaterThan(0);
    expect(compareRowOrder(a, a)).toBe(0);
  });
});
