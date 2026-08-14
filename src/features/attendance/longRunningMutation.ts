/**
 * Importing BioTime data and rebuilding a company timesheet can legitimately
 * take longer than the default interactive API request timeout.
 */
export const LONG_RUNNING_ATTENDANCE_MUTATION_TIMEOUT_MS = 180_000;

export const longRunningAttendanceMutationConfig = {
  timeout: LONG_RUNNING_ATTENDANCE_MUTATION_TIMEOUT_MS,
} as const;
