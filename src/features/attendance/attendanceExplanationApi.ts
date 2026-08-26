import { api } from "../../shared/api/httpClient";

export type AttendanceExplanationType =
  | "MISSING_PUNCH"
  | "LATE"
  | "EARLY_LEAVE"
  | "OUT_OF_OFFICE"
  | "OTHER";

export interface AttendanceExplanation {
  id: string;
  employeeId: string;
  timesheetDayId: string;
  type: AttendanceExplanationType;
  reason: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewerId?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  employee?: {
    employeeCode?: string | null;
    fullName?: string | null;
  } | null;
  timesheetDay?: {
    workDate?: string | null;
    displaySymbol?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

interface AttendanceExplanationListResponse {
  items?: AttendanceExplanation[];
}

export async function listPendingAttendanceExplanations(): Promise<
  AttendanceExplanation[]
> {
  const response = await api.get<AttendanceExplanationListResponse>(
    "/attendance/explanations/pending",
  );
  return response.items ?? [];
}

function reviewAttendanceExplanation(
  id: string,
  action: "approve" | "reject",
  note?: string,
): Promise<AttendanceExplanation> {
  return api.post<AttendanceExplanation>(
    "/attendance/explanations/" + id + "/" + action,
    note?.trim() ? { note: note.trim() } : {},
  );
}

export function approveAttendanceExplanation(id: string, note?: string) {
  return reviewAttendanceExplanation(id, "approve", note);
}

export function rejectAttendanceExplanation(id: string, note?: string) {
  return reviewAttendanceExplanation(id, "reject", note);
}
