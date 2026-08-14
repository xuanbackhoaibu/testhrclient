import { beforeEach, describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("../../shared/api/httpClient", () => ({
  api: { post },
}));

import { manualAttendanceSync } from "./attendanceApi";
import { recomputeTimesheet } from "./timesheetApi";

describe("long-running attendance mutations", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("allows the BioTime manual sync to run up to three minutes", async () => {
    const payload = {
      startDate: "2026-08-13",
      endDate: "2026-08-14",
      refreshDepartments: false,
    };
    post.mockResolvedValue({ success: true });

    await manualAttendanceSync(payload);

    expect(post).toHaveBeenCalledWith("/attendance/sync/manual", payload, {
      timeout: 180_000,
    });
  });

  it("allows recomputing a timesheet to run up to three minutes", async () => {
    const payload = {
      fromDate: "2026-08-01",
      toDate: "2026-08-31",
    };
    post.mockResolvedValue({
      processed: 423,
      skippedLocked: 0,
      skippedAdjusted: 0,
    });

    await recomputeTimesheet(payload);

    expect(post).toHaveBeenCalledWith(
      "/attendance/timesheet/recompute",
      payload,
      { timeout: 180_000 },
    );
  });

  it("passes an abort signal for a historical range request", async () => {
    const controller = new AbortController();
    const payload = {
      fromDate: "2026-07-01",
      toDate: "2026-07-31",
      departmentIds: ["dept-1"],
    };
    post.mockResolvedValue({
      processed: 0,
      skippedLocked: 0,
      skippedAdjusted: 0,
    });

    await recomputeTimesheet(payload, controller.signal);

    expect(post).toHaveBeenCalledWith(
      "/attendance/timesheet/recompute",
      payload,
      { timeout: 180_000, signal: controller.signal },
    );
  });
});
