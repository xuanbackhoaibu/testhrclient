import { describe, expect, it } from "vitest";

import {
  buildShiftAssignmentUrl,
  getActiveShiftPrefillId,
} from "./shiftAssignmentNavigation";

describe("shift assignment navigation", () => {
  it("builds an explicit one-time handoff to the assignment form", () => {
    expect(buildShiftAssignmentUrl("shift HC/01")).toBe(
      "/attendance/assignments?assignShiftId=shift+HC%2F01&open=1",
    );
  });

  it("prefills only a shift that remains active", () => {
    const shifts = [
      { id: "hc", status: "ACTIVE" as const },
      { id: "old", status: "INACTIVE" as const },
    ];

    expect(getActiveShiftPrefillId(shifts, "hc")).toBe("hc");
    expect(getActiveShiftPrefillId(shifts, "old")).toBeNull();
    expect(getActiveShiftPrefillId(shifts, "missing")).toBeNull();
  });
});
