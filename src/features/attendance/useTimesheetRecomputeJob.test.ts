import { describe, expect, it } from "vitest";

import {
  mergeTimesheetRecomputeJobState,
  type TimesheetRecomputeJobState,
} from "./useTimesheetRecomputeJob";
import type { TimesheetRecomputeJob } from "./timesheetTypes";

function currentState(): TimesheetRecomputeJobState {
  return {
    status: "RUNNING",
    jobId: "job-1",
    start: { year: 2026, month: 4 },
    end: { year: 2026, month: 8 },
    totalEmployees: 433,
    eligibleEmployees: 12,
    totalMonths: 5,
    eligibleMonths: 5,
    skippedNoSourceMonths: 0,
    sourceMonths: [{ year: 2026, month: 8 }],
    estimatedCells: 372,
    totalBatches: 1,
    completedBatches: 0,
    progressPercent: 80,
    completedMonths: 4,
    currentMonth: { year: 2026, month: 8 },
    result: {
      processed: 372,
      skippedLocked: 0,
      skippedAdjusted: 0,
      skippedClosed: 0,
    },
    cancellationRequested: false,
    error: null,
    pollingError: "Sẽ thử lại sau 2 giây.",
  };
}

function terminalJob(): TimesheetRecomputeJob {
  return {
    id: "job-1",
    status: "SUCCEEDED",
    fromDate: "2026-04-01",
    toDate: "2026-08-31",
    totalEmployees: 433,
    eligibleEmployees: 12,
    totalMonths: 5,
    eligibleMonths: 5,
    skippedNoSourceMonths: 0,
    sourceMonths: [{ year: 2026, month: 8 }],
    estimatedCells: 372,
    totalBatches: 1,
    completedBatches: 1,
    progressPercent: 100,
    completedMonths: 5,
    currentMonth: null,
    processed: 465,
    skippedLocked: 0,
    skippedAdjusted: 0,
    skippedClosed: 0,
    cancelRequestedAt: null,
    errorMessage: null,
    monitorUrl: "/attendance/timesheet/recompute-jobs/job-1",
  };
}

describe("mergeTimesheetRecomputeJobState", () => {
  it("clears the previous current month and transient polling message on a terminal job", () => {
    const next = mergeTimesheetRecomputeJobState(currentState(), terminalJob());

    expect(next.status).toBe("SUCCEEDED");
    expect(next.currentMonth).toBeNull();
    expect(next.pollingError).toBeNull();
  });
});
