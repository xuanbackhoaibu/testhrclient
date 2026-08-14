import type {
  RecomputePayload,
  RecomputeResult,
  TimesheetRecomputeJob,
} from "./timesheetTypes";
import { ApiError } from "../../shared/api/api.types";

export interface TimesheetMonth {
  month: number;
  year: number;
}

export interface TimesheetRecomputeRangeProgress {
  totalMonths: number;
  completedMonths: number;
  currentMonth: TimesheetMonth | null;
  result: RecomputeResult;
}

export interface TimesheetRecomputeRangeResult {
  status: "completed" | "cancelled";
  totalMonths: number;
  completedMonths: number;
  result: RecomputeResult;
}

export type RecomputeMonth = (
  payload: RecomputePayload,
  signal?: AbortSignal,
) => Promise<RecomputeResult>;

export interface RecomputeTimesheetMonthRangeInput {
  start: TimesheetMonth;
  end: TimesheetMonth;
  /**
   * The active view scope is copied when the run starts. It must never be
   * rebuilt from filters the user changes while a historical run is active.
   */
  scope: Omit<RecomputePayload, "fromDate" | "toDate">;
  recomputeMonth: RecomputeMonth;
  signal?: AbortSignal;
  onProgress?: (progress: TimesheetRecomputeRangeProgress) => void;
}

const EMPTY_RESULT: RecomputeResult = {
  processed: 0,
  skippedLocked: 0,
  skippedAdjusted: 0,
};

function isValidMonth({ month, year }: TimesheetMonth): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  );
}

function monthIndex({ year, month }: TimesheetMonth): number {
  return year * 12 + (month - 1);
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function lastDayOfTimesheetMonth({
  year,
  month,
}: TimesheetMonth): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** Returns every month inclusively, oldest first, without using local time. */
export function listTimesheetMonths(
  start: TimesheetMonth,
  end: TimesheetMonth,
): TimesheetMonth[] {
  if (!isValidMonth(start) || !isValidMonth(end)) {
    throw new Error("Kỳ công không hợp lệ.");
  }
  if (monthIndex(start) > monthIndex(end)) {
    throw new Error("Kỳ bắt đầu phải trước hoặc bằng kỳ kết thúc.");
  }

  const months: TimesheetMonth[] = [];
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({ year, month });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

export function isRecomputeAbort(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "ERR_CANCELED"
  );
}

/**
 * Fallback for the synchronous v1 API. Deliberately sends one calendar month
 * at a time: this keeps a whole-company history rebuild from flooding the API
 * or the browser, supplies truthful completed-month progress, and leaves the
 * page responsive. A future start-job + polling API can replace only this
 * executor; callers retain the same progress/result contract.
 */
export async function recomputeTimesheetMonths(
  input: RecomputeTimesheetMonthRangeInput,
): Promise<TimesheetRecomputeRangeResult> {
  const months = listTimesheetMonths(input.start, input.end);
  let result = { ...EMPTY_RESULT };
  let completedMonths = 0;

  for (const currentMonth of months) {
    if (input.signal?.aborted) {
      return {
        status: "cancelled",
        totalMonths: months.length,
        completedMonths,
        result,
      };
    }

    try {
      const monthResult = await input.recomputeMonth(
        {
          ...input.scope,
          fromDate: formatIsoDate(currentMonth.year, currentMonth.month, 1),
          toDate: lastDayOfTimesheetMonth(currentMonth),
        },
        input.signal,
      );
      completedMonths += 1;
      result = {
        processed: result.processed + monthResult.processed,
        skippedLocked: result.skippedLocked + monthResult.skippedLocked,
        skippedAdjusted: result.skippedAdjusted + monthResult.skippedAdjusted,
      };
      input.onProgress?.({
        totalMonths: months.length,
        completedMonths,
        currentMonth,
        result,
      });
    } catch (error) {
      if (input.signal?.aborted || isRecomputeAbort(error)) {
        return {
          status: "cancelled",
          totalMonths: months.length,
          completedMonths,
          result,
        };
      }
      throw error;
    }
  }

  return {
    status: "completed",
    totalMonths: months.length,
    completedMonths,
    result,
  };
}

export const TIMESHEET_RECOMPUTE_JOB_POLL_INTERVAL_MS = 2_000;
export const TIMESHEET_RECOMPUTE_JOB_MAX_RETRY_DELAY_MS = 30_000;

export interface TimesheetRecomputeJobClient {
  getJob: (id: string, signal?: AbortSignal) => Promise<TimesheetRecomputeJob>;
}

export interface TimesheetRecomputeJobPollRetry {
  error: ApiError;
  retryCount: number;
  retryDelayMs: number;
}

export function isTimesheetRecomputeJobTerminal(
  job: TimesheetRecomputeJob,
): boolean {
  return ["SUCCEEDED", "FAILED", "CANCELLED"].includes(job.status);
}

export function timesheetMonthFromJob(
  value: TimesheetRecomputeJob["currentMonth"],
): TimesheetMonth | null {
  return value && isValidMonth(value) ? value : null;
}

export function resultFromTimesheetRecomputeJob(
  job: TimesheetRecomputeJob,
): RecomputeResult {
  return {
    processed: job.processed,
    skippedLocked: job.skippedLocked,
    skippedAdjusted: job.skippedAdjusted,
    skippedClosed: job.skippedClosed,
  };
}

function waitForNextJobPoll(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Polling cancelled", "AbortError"));
      return;
    }

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Polling cancelled", "AbortError"));
    };
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * A polling failure is not a job failure. The server keeps a durable job and
 * the browser must keep its job id until a definitive response says otherwise.
 */
export function isRetryableTimesheetRecomputePollError(
  error: unknown,
): error is ApiError {
  if (!(error instanceof ApiError)) return false;

  const { statusCode } = error;
  return (
    statusCode === 0 ||
    statusCode === 408 ||
    statusCode === 425 ||
    statusCode === 429 ||
    statusCode >= 500
  );
}

export function timesheetRecomputePollRetryDelayMs(
  retryCount: number,
  baseDelayMs = TIMESHEET_RECOMPUTE_JOB_POLL_INTERVAL_MS,
  maxDelayMs = TIMESHEET_RECOMPUTE_JOB_MAX_RETRY_DELAY_MS,
): number {
  const safeRetryCount = Math.max(1, Math.floor(retryCount));
  const safeBaseDelay = Math.max(0, baseDelayMs);
  const safeMaxDelay = Math.max(safeBaseDelay, maxDelayMs);
  return Math.min(
    safeMaxDelay,
    safeBaseDelay * 2 ** Math.min(safeRetryCount - 1, 16),
  );
}

export interface LoadTimesheetRecomputeJobInput {
  jobId: string;
  client: TimesheetRecomputeJobClient;
  signal?: AbortSignal;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  onTransientError?: (retry: TimesheetRecomputeJobPollRetry) => void;
}

/**
 * Loads a durable job with bounded exponential backoff for temporary API
 * failures. Authorization/not-found errors are deliberately surfaced, so the
 * caller can clear a stale local job id instead of retrying forever.
 */
export async function loadTimesheetRecomputeJob(
  input: LoadTimesheetRecomputeJobInput,
): Promise<TimesheetRecomputeJob> {
  let retryCount = 0;

  while (true) {
    try {
      return await input.client.getJob(input.jobId, input.signal);
    } catch (error) {
      if (!isRetryableTimesheetRecomputePollError(error)) throw error;

      retryCount += 1;
      const retryDelayMs = timesheetRecomputePollRetryDelayMs(
        retryCount,
        input.retryBaseDelayMs,
        input.retryMaxDelayMs,
      );
      input.onTransientError?.({ error, retryCount, retryDelayMs });
      await waitForNextJobPoll(retryDelayMs, input.signal);
    }
  }
}

export interface MonitorTimesheetRecomputeJobInput {
  job: TimesheetRecomputeJob;
  client: TimesheetRecomputeJobClient;
  signal?: AbortSignal;
  pollIntervalMs?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  onProgress?: (job: TimesheetRecomputeJob) => void;
  onTransientError?: (retry: TimesheetRecomputeJobPollRetry) => void;
}

/**
 * The UI knows only this monitor contract. Job transport is intentionally
 * isolated here, so changing enqueue/poll endpoints never changes the modal.
 */
export async function monitorTimesheetRecomputeJob(
  input: MonitorTimesheetRecomputeJobInput,
): Promise<TimesheetRecomputeJob> {
  let job = input.job;
  const pollIntervalMs =
    input.pollIntervalMs ?? TIMESHEET_RECOMPUTE_JOB_POLL_INTERVAL_MS;
  input.onProgress?.(job);

  while (!isTimesheetRecomputeJobTerminal(job)) {
    await waitForNextJobPoll(pollIntervalMs, input.signal);
    job = await loadTimesheetRecomputeJob({
      jobId: job.id,
      client: input.client,
      signal: input.signal,
      retryBaseDelayMs: input.retryBaseDelayMs,
      retryMaxDelayMs: input.retryMaxDelayMs,
      onTransientError: input.onTransientError,
    });
    input.onProgress?.(job);
  }

  return job;
}
