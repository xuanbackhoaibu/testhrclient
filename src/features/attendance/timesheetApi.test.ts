import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, download } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  download: vi.fn(),
}));

vi.mock("../../shared/api/httpClient", () => ({
  api: { get, post, download },
}));

import {
  cancelTimesheetRecomputeJob,
  downloadTimesheetGridExport,
  getTimesheetGrid,
  getTimesheetRecomputeJob,
  startTimesheetRecomputeJob,
} from "./timesheetApi";

describe("timesheet grid export query", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    download.mockReset();
  });

  it("uses the same active period and scope filters as the visible grid", async () => {
    const activeGridQuery = {
      month: 8,
      year: 2026,
      employeeId: "employee-17",
      departmentIds: ["department-02", "department-07"],
      unitIds: ["unit-01", "unit-03"],
    };
    const expectedParams = {
      ...activeGridQuery,
      departmentIds: "department-02,department-07",
      unitIds: "unit-01,unit-03",
    };

    get.mockResolvedValue({ rows: [] });
    download.mockResolvedValue(undefined);

    await getTimesheetGrid(activeGridQuery);
    await downloadTimesheetGridExport(activeGridQuery);

    expect(get).toHaveBeenCalledWith("/attendance/timesheet/grid", {
      params: expectedParams,
    });
    expect(download).toHaveBeenCalledWith(
      "/attendance/timesheet/export",
      "bang-cham-cong-2026-08.xlsx",
      expectedParams,
    );
  });

  it("uses enqueue, poll, and cancel endpoints for a scoped background job", async () => {
    const payload = {
      fromDate: "2020-01-01",
      toDate: "2026-08-31",
      employeeId: "employee-17",
      departmentIds: ["department-02", "department-07"],
      unitIds: ["unit-01"],
    };
    const job = { id: "job-1", status: "QUEUED" };
    const controller = new AbortController();
    post.mockResolvedValue(job);
    get.mockResolvedValue(job);

    await expect(startTimesheetRecomputeJob(payload)).resolves.toEqual(job);
    await expect(
      getTimesheetRecomputeJob("job-1", controller.signal),
    ).resolves.toEqual(job);
    await expect(cancelTimesheetRecomputeJob("job-1")).resolves.toEqual(job);

    expect(post).toHaveBeenNthCalledWith(
      1,
      "/attendance/timesheet/recompute-jobs",
      payload,
      { timeout: 180_000 },
    );
    expect(get).toHaveBeenLastCalledWith(
      "/attendance/timesheet/recompute-jobs/job-1",
      { signal: controller.signal },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/attendance/timesheet/recompute-jobs/job-1/cancel",
    );
  });
});
