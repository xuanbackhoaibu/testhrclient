import {
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  cancelTimesheetRecomputeJob,
  getTimesheetRecomputeJob,
  startTimesheetRecomputeJob,
} from "./timesheetApi";
import {
  isRecomputeAbort,
  isTimesheetRecomputeJobTerminal,
  lastDayOfTimesheetMonth,
  listTimesheetMonths,
  loadTimesheetRecomputeJob,
  monitorTimesheetRecomputeJob,
  resultFromTimesheetRecomputeJob,
  timesheetMonthFromJob,
  type TimesheetMonth,
  type TimesheetRecomputeJobPollRetry,
} from "./timesheetRecomputeRange";
import type {
  RecomputePayload,
  RecomputeResult,
  TimesheetRecomputeJob,
  TimesheetRecomputeJobStatus,
} from "./timesheetTypes";
import { timesheetKeys } from "./useTimesheet";
import { ApiError } from "../../shared/api/api.types";

export interface StartTimesheetRecomputeJobInput {
  start: TimesheetMonth;
  end: TimesheetMonth;
  /** Copied at click time, so later filter changes cannot widen a running job. */
  scope: Omit<RecomputePayload, "fromDate" | "toDate">;
}

export interface TimesheetRecomputeJobState {
  status: "IDLE" | TimesheetRecomputeJobStatus;
  jobId: string | null;
  start: TimesheetMonth | null;
  end: TimesheetMonth | null;
  totalEmployees: number | null;
  eligibleEmployees: number | null;
  totalMonths: number;
  eligibleMonths: number | null;
  skippedNoSourceMonths: number | null;
  sourceMonths: TimesheetMonth[] | null;
  estimatedCells: number | null;
  totalBatches: number | null;
  completedBatches: number | null;
  progressPercent: number | null;
  completedMonths: number;
  currentMonth: TimesheetMonth | null;
  result: RecomputeResult;
  cancellationRequested: boolean;
  error: string | null;
  pollingError: string | null;
}

const emptyResult: RecomputeResult = {
  processed: 0,
  skippedLocked: 0,
  skippedAdjusted: 0,
  skippedClosed: 0,
};

const initialState: TimesheetRecomputeJobState = {
  status: "IDLE",
  jobId: null,
  start: null,
  end: null,
  totalEmployees: null,
  eligibleEmployees: null,
  totalMonths: 0,
  eligibleMonths: null,
  skippedNoSourceMonths: null,
  sourceMonths: null,
  estimatedCells: null,
  totalBatches: null,
  completedBatches: null,
  progressPercent: null,
  completedMonths: 0,
  currentMonth: null,
  result: emptyResult,
  cancellationRequested: false,
  error: null,
  pollingError: null,
};

const ACTIVE_TIMESHEET_RECOMPUTE_JOB_STORAGE_KEY =
  "hrm.attendance.timesheet-recompute-job-id";

function readActiveJobId(): string | null {
  try {
    return window.sessionStorage.getItem(
      ACTIVE_TIMESHEET_RECOMPUTE_JOB_STORAGE_KEY,
    );
  } catch {
    return null;
  }
}

function persistActiveJobId(id: string): void {
  try {
    window.sessionStorage.setItem(
      ACTIVE_TIMESHEET_RECOMPUTE_JOB_STORAGE_KEY,
      id,
    );
  } catch {
    // Storage can be unavailable in a private browser context; polling in the
    // current page still works normally.
  }
}

function clearActiveJobId(): void {
  try {
    window.sessionStorage.removeItem(
      ACTIVE_TIMESHEET_RECOMPUTE_JOB_STORAGE_KEY,
    );
  } catch {
    // Ignore unavailable storage. There is no sensitive scope stored here.
  }
}

function timesheetMonthFromIso(value: string): TimesheetMonth | null {
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return Number.isInteger(year) && month >= 1 && month <= 12
    ? { year, month }
    : null;
}

function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 403;
}

function isGone(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 404;
}

function monthStart({ year, month }: TimesheetMonth): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Vui lòng thử lại sau.";
}

function pollingErrorMessage({
  retryDelayMs,
}: TimesheetRecomputeJobPollRetry): string {
  const seconds = Math.max(1, Math.ceil(retryDelayMs / 1_000));
  return `Chưa kết nối được để theo dõi job. Máy chủ vẫn tiếp tục xử lý; sẽ thử lại sau ${seconds} giây.`;
}

export function mergeTimesheetRecomputeJobState(
  current: TimesheetRecomputeJobState,
  job: TimesheetRecomputeJob,
): TimesheetRecomputeJobState {
  return {
    ...current,
    start: current.start ?? timesheetMonthFromIso(job.fromDate),
    end: current.end ?? timesheetMonthFromIso(job.toDate),
    status: job.status,
    jobId: job.id,
    totalEmployees: job.totalEmployees,
    eligibleEmployees: job.eligibleEmployees ?? null,
    totalMonths: job.totalMonths,
    eligibleMonths: job.eligibleMonths ?? null,
    skippedNoSourceMonths: job.skippedNoSourceMonths ?? null,
    sourceMonths: job.sourceMonths ?? null,
    estimatedCells: job.estimatedCells ?? null,
    totalBatches: job.totalBatches ?? null,
    completedBatches: job.completedBatches ?? null,
    progressPercent: job.progressPercent ?? null,
    completedMonths: job.completedMonths,
    // A terminal response has null currentMonth. Do not retain the previous
    // month, otherwise a completed job is falsely presented as still running.
    currentMonth: timesheetMonthFromJob(job.currentMonth),
    result: resultFromTimesheetRecomputeJob(job),
    cancellationRequested:
      !isTimesheetRecomputeJobTerminal(job) &&
      (current.cancellationRequested || Boolean(job.cancelRequestedAt)),
    error: job.errorMessage,
    pollingError: null,
  };
}
/**
 * Job adapter for the monthly-timesheet UI. The modal only consumes this
 * start/progress/cancel state; changing the server transport later does not
 * require changing the UI or rebuilding the table while progress is polled.
 */
export function useTimesheetRecomputeJob() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<TimesheetRecomputeJobState>(initialState);
  const pollingControllerRef = useRef<AbortController | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // This stops browser polling only. The server job intentionally keeps
      // running so navigating away cannot leave a partial, unknown write.
      const controller = pollingControllerRef.current;
      controller?.abort();
      if (pollingControllerRef.current === controller) {
        pollingControllerRef.current = null;
      }
    };
  }, []);

  const updateState = useCallback(
    (next: SetStateAction<TimesheetRecomputeJobState>) => {
      if (mountedRef.current) setState(next);
    },
    [],
  );

  const applyJob = useCallback(
    (job: TimesheetRecomputeJob) => {
      if (isTimesheetRecomputeJobTerminal(job)) {
        clearActiveJobId();
      }
      updateState((current) => mergeTimesheetRecomputeJobState(current, job));
    },
    [updateState],
  );

  const handleTransientPollingError = useCallback(
    (retry: TimesheetRecomputeJobPollRetry) => {
      updateState((current) => ({
        ...current,
        pollingError: pollingErrorMessage(retry),
      }));
    },
    [updateState],
  );

  const monitorJob = useCallback(
    async (job: TimesheetRecomputeJob, controller: AbortController) => {
      const completedJob = await monitorTimesheetRecomputeJob({
        job,
        client: { getJob: getTimesheetRecomputeJob },
        signal: controller.signal,
        onProgress: applyJob,
        onTransientError: handleTransientPollingError,
      });
      applyJob(completedJob);
      return completedJob;
    },
    [applyJob, handleTransientPollingError],
  );

  useEffect(() => {
    const persistedJobId = readActiveJobId();
    if (!persistedJobId || pollingControllerRef.current) return;

    const controller = new AbortController();
    pollingControllerRef.current = controller;
    activeJobIdRef.current = persistedJobId;
    updateState({
      ...initialState,
      status: "QUEUED",
      jobId: persistedJobId,
    });

    void (async () => {
      let completed = false;
      try {
        const job = await loadTimesheetRecomputeJob({
          jobId: persistedJobId,
          client: { getJob: getTimesheetRecomputeJob },
          signal: controller.signal,
          onTransientError: handleTransientPollingError,
        });
        await monitorJob(job, controller);
        completed = true;
      } catch (error) {
        if (isForbidden(error) || isGone(error)) clearActiveJobId();
        if (!isRecomputeAbort(error)) {
          updateState((current) => ({
            ...current,
            status: "FAILED",
            cancellationRequested: false,
            error: errorMessage(error),
          }));
        }
      } finally {
        if (pollingControllerRef.current === controller) {
          pollingControllerRef.current = null;
        }
        activeJobIdRef.current = null;
        if (completed) {
          void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        }
      }
    })();
  }, [handleTransientPollingError, monitorJob, queryClient, updateState]);

  const start = useCallback(
    async (
      input: StartTimesheetRecomputeJobInput,
    ): Promise<TimesheetRecomputeJob> => {
      if (pollingControllerRef.current) {
        throw new Error("Một lượt cập nhật bảng công đang chạy.");
      }

      const selectedMonths = listTimesheetMonths(input.start, input.end);
      const controller = new AbortController();
      pollingControllerRef.current = controller;
      let jobStarted = false;
      updateState({
        ...initialState,
        status: "QUEUED",
        start: input.start,
        end: input.end,
        totalMonths: selectedMonths.length,
        currentMonth: selectedMonths[0] ?? null,
      });

      try {
        const job = await startTimesheetRecomputeJob({
          ...input.scope,
          fromDate: monthStart(input.start),
          toDate: lastDayOfTimesheetMonth(input.end),
        });
        jobStarted = true;
        activeJobIdRef.current = job.id;
        persistActiveJobId(job.id);

        const completedJob = await monitorJob(job, controller);
        return completedJob;
      } catch (error) {
        if (isForbidden(error) || isGone(error)) clearActiveJobId();
        if (!isRecomputeAbort(error)) {
          updateState((current) => ({
            ...current,
            status: "FAILED",
            cancellationRequested: false,
            error: errorMessage(error),
          }));
        }
        throw error;
      } finally {
        if (pollingControllerRef.current === controller) {
          pollingControllerRef.current = null;
        }
        activeJobIdRef.current = null;
        // The grid is invalidated once when the job leaves this screen. It is
        // deliberately not refetched on every two-second poll.
        if (jobStarted) {
          void queryClient.invalidateQueries({ queryKey: timesheetKeys.all });
        }
      }
    },
    [monitorJob, queryClient, updateState],
  );

  const cancel =
    useCallback(async (): Promise<TimesheetRecomputeJob | null> => {
      const jobId = activeJobIdRef.current;
      if (!jobId) return null;

      updateState((current) => ({
        ...current,
        cancellationRequested: true,
        error: null,
      }));
      try {
        const job = await cancelTimesheetRecomputeJob(jobId);
        applyJob(job);
        return job;
      } catch (error) {
        if (isForbidden(error) || isGone(error)) clearActiveJobId();
        updateState((current) => ({
          ...current,
          cancellationRequested: false,
          error: errorMessage(error),
        }));
        throw error;
      }
    }, [applyJob, updateState]);

  const clear = useCallback(() => {
    if (pollingControllerRef.current) return;
    updateState(initialState);
  }, [updateState]);

  const isRunning = state.status === "QUEUED" || state.status === "RUNNING";

  return { ...state, isRunning, start, cancel, clear };
}
