import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../shared/api/api.types";

import {
  isTimesheetRecomputeJobTerminal,
  lastDayOfTimesheetMonth,
  listTimesheetMonths,
  monitorTimesheetRecomputeJob,
  recomputeTimesheetMonths,
  timesheetMonthFromJob,
} from "./timesheetRecomputeRange";
import type { TimesheetRecomputeJob } from "./timesheetTypes";

function makeJob(
  overrides: Partial<TimesheetRecomputeJob> = {},
): TimesheetRecomputeJob {
  return {
    id: "job-1",
    status: "QUEUED",
    fromDate: "2020-01-01",
    toDate: "2026-08-31",
    totalEmployees: 433,
    eligibleEmployees: 12,
    totalMonths: 80,
    eligibleMonths: 5,
    skippedNoSourceMonths: 75,
    sourceMonths: [
      { year: 2026, month: 4 },
      { year: 2026, month: 5 },
      { year: 2026, month: 6 },
      { year: 2026, month: 7 },
      { year: 2026, month: 8 },
    ],
    estimatedCells: 1_860,
    totalBatches: 5,
    completedBatches: 0,
    progressPercent: 0,
    completedMonths: 0,
    currentMonth: { year: 2026, month: 4 },
    processed: 0,
    skippedLocked: 0,
    skippedAdjusted: 0,
    skippedClosed: 0,
    cancelRequestedAt: null,
    errorMessage: null,
    monitorUrl: "/attendance/timesheet/recompute-jobs/job-1",
    ...overrides,
  };
}

describe("timesheet historical recompute range", () => {
  it("lists inclusive months across a year boundary", () => {
    expect(
      listTimesheetMonths({ year: 2025, month: 11 }, { year: 2026, month: 2 }),
    ).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
    ]);
  });

  it("uses the last calendar day of leap February", () => {
    expect(lastDayOfTimesheetMonth({ year: 2024, month: 2 })).toBe(
      "2024-02-29",
    );
  });

  it("runs one scoped request at a time and aggregates truthful progress", async () => {
    const recomputeMonth = vi
      .fn()
      .mockResolvedValueOnce({
        processed: 20,
        skippedLocked: 1,
        skippedAdjusted: 0,
      })
      .mockResolvedValueOnce({
        processed: 22,
        skippedLocked: 0,
        skippedAdjusted: 2,
      });
    const progress = vi.fn();

    const result = await recomputeTimesheetMonths({
      start: { year: 2026, month: 7 },
      end: { year: 2026, month: 8 },
      scope: { departmentIds: ["dept-1"], employeeId: "employee-1" },
      recomputeMonth,
      onProgress: progress,
    });

    expect(recomputeMonth).toHaveBeenNthCalledWith(
      1,
      {
        departmentIds: ["dept-1"],
        employeeId: "employee-1",
        fromDate: "2026-07-01",
        toDate: "2026-07-31",
      },
      undefined,
    );
    expect(recomputeMonth).toHaveBeenNthCalledWith(
      2,
      {
        departmentIds: ["dept-1"],
        employeeId: "employee-1",
        fromDate: "2026-08-01",
        toDate: "2026-08-31",
      },
      undefined,
    );
    expect(progress).toHaveBeenLastCalledWith({
      totalMonths: 2,
      completedMonths: 2,
      currentMonth: { year: 2026, month: 8 },
      result: { processed: 42, skippedLocked: 1, skippedAdjusted: 2 },
    });
    expect(result).toEqual({
      status: "completed",
      totalMonths: 2,
      completedMonths: 2,
      result: { processed: 42, skippedLocked: 1, skippedAdjusted: 2 },
    });
  });

  it("stops before scheduling the next month when cancelled", async () => {
    const controller = new AbortController();
    const recomputeMonth = vi.fn(async () => {
      controller.abort();
      return { processed: 8, skippedLocked: 0, skippedAdjusted: 0 };
    });

    const result = await recomputeTimesheetMonths({
      start: { year: 2026, month: 7 },
      end: { year: 2026, month: 8 },
      scope: {},
      recomputeMonth,
      signal: controller.signal,
    });

    expect(recomputeMonth).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "cancelled",
      totalMonths: 2,
      completedMonths: 1,
      result: { processed: 8, skippedLocked: 0, skippedAdjusted: 0 },
    });
  });

  it("uses the backend structured currentMonth contract", () => {
    expect(timesheetMonthFromJob({ year: 2026, month: 8 })).toEqual({
      year: 2026,
      month: 8,
    });
    expect(timesheetMonthFromJob({ year: 2026, month: 13 })).toBeNull();
    expect(timesheetMonthFromJob(null)).toBeNull();
    expect(
      isTimesheetRecomputeJobTerminal(makeJob({ status: "SUCCEEDED" })),
    ).toBe(true);
    expect(
      isTimesheetRecomputeJobTerminal(makeJob({ status: "RUNNING" })),
    ).toBe(false);
  });

  it("polls the job until the terminal server status", async () => {
    const queued = makeJob({
      status: "QUEUED",
      currentMonth: { year: 2026, month: 4 },
    });
    const running = makeJob({
      status: "RUNNING",
      completedMonths: 1,
      completedBatches: 1,
      currentMonth: { year: 2026, month: 5 },
      progressPercent: 20,
    });
    const succeeded = makeJob({
      status: "SUCCEEDED",
      completedMonths: 5,
      completedBatches: 5,
      currentMonth: null,
      processed: 1_234,
      progressPercent: 100,
    });
    const getJob = vi
      .fn()
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(succeeded);
    const onProgress = vi.fn();

    vi.stubGlobal("window", globalThis);
    try {
      const job = await monitorTimesheetRecomputeJob({
        job: queued,
        client: { getJob },
        pollIntervalMs: 0,
        onProgress,
      });

      expect(job).toEqual(succeeded);
      expect(getJob).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, queued);
      expect(onProgress).toHaveBeenNthCalledWith(2, running);
      expect(onProgress).toHaveBeenLastCalledWith(succeeded);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("retries a transient poll failure without treating the durable job as failed", async () => {
    const queued = makeJob({ status: "RUNNING" });
    const succeeded = makeJob({
      status: "SUCCEEDED",
      currentMonth: null,
      completedMonths: 5,
      completedBatches: 5,
      progressPercent: 100,
    });
    const transientError = new ApiError({
      message: "Temporary gateway error",
      statusCode: 503,
      errorCode: "HTTP_503",
    });
    const getJob = vi
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce(succeeded);
    const onTransientError = vi.fn();

    vi.stubGlobal("window", globalThis);
    try {
      await expect(
        monitorTimesheetRecomputeJob({
          job: queued,
          client: { getJob },
          pollIntervalMs: 0,
          retryBaseDelayMs: 0,
          onTransientError,
        }),
      ).resolves.toEqual(succeeded);

      expect(getJob).toHaveBeenCalledTimes(2);
      expect(onTransientError).toHaveBeenCalledWith({
        error: transientError,
        retryCount: 1,
        retryDelayMs: 0,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
