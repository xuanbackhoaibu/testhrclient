import { describe, expect, it } from "vitest";

import { formatVietnamBusinessDate } from "./shiftAssignmentDate";

describe("formatVietnamBusinessDate", () => {
  it("uses the Vietnam business date across the UTC boundary", () => {
    expect(
      formatVietnamBusinessDate(new Date("2026-08-13T16:59:59.000Z")),
    ).toBe("2026-08-13");
    expect(
      formatVietnamBusinessDate(new Date("2026-08-13T17:00:00.000Z")),
    ).toBe("2026-08-14");
  });
});
