import { ROUTES } from "../../shared/constants/routes";

import type { WorkShift } from "./workScheduleTypes";

/**
 * Keeps the handoff from the reusable shift catalogue to the monthly
 * assignment grid explicit. A shift is never assigned until HR chooses CBNV
 * and submits the assignment.
 */
export function buildShiftAssignmentUrl(shiftId: string): string {
  const params = new URLSearchParams({ assignShiftId: shiftId });
  return `${ROUTES.shiftAssignments}?${params.toString()}`;
}

/** Only an active shift can be prefilled into a new assignment. */
export function getActiveShiftPrefillId(
  shifts: ReadonlyArray<Pick<WorkShift, "id" | "status">> | undefined,
  requestedShiftId: string | null,
): string | null {
  if (!requestedShiftId) {
    return null;
  }

  return shifts?.some(
    (shift) => shift.id === requestedShiftId && shift.status === "ACTIVE",
  )
    ? requestedShiftId
    : null;
}
