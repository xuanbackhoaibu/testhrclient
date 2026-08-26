export type AnnualLeaveReconciliationStatus =
  | "PENDING_HR_CSV_RECONCILIATION"
  | "RECONCILED"
  | "MISMATCH"
  | "BLOCKED_MISSING_HIRE_DATE";

export interface AnnualLeaveQuery {
  year: number;
  page: number;
  pageSize: number;
  unitId?: string;
  departmentId?: string;
  search?: string;
  reconciliationStatus?: AnnualLeaveReconciliationStatus;
}

export interface AnnualLeaveRow {
  sequence: number;
  employeeId: string;
  employeeCode: string;
  attendanceCode: string | null;
  fullName: string;
  hireDate: string | null;
  unit: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  year: number;
  carryOverDays: number;
  accruedDays: number;
  seniorityDays: number;
  otherDays: number;
  monthlyUsed: number[];
  previousYearUsedDays: number;
  usedCurrentYearDays: number;
  carryOverUsedDays: number;
  carryOverExpiredDays: number;
  remainingDays: number;
  reconciled: boolean;
  reconciliationStatus: AnnualLeaveReconciliationStatus;
  warnings: string[];
}

export interface AnnualLeaveListResult {
  data: AnnualLeaveRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface AnnualLeaveValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface AnnualLeaveImportPreviewRow {
  rowNumber: number;
  status: "VALID" | "WARNING" | "ERROR";
  rawData: {
    fullName?: string;
    attendanceCode?: string;
    departmentName?: string;
    hireDate?: string | null;
  };
  errors: AnnualLeaveValidationIssue[];
  warnings: AnnualLeaveValidationIssue[];
}

export interface AnnualLeaveImportPreview {
  batchId: string;
  year: number;
  totalRows: number;
  validRows: number;
  warningRows: number;
  failedRows: number;
  canCommit: boolean;
  requiresNote: boolean;
  rows: AnnualLeaveImportPreviewRow[];
}

export interface AnnualLeaveLedgerItem {
  id: string;
  transactionType: string;
  daysDelta: number;
  usableDelta: number;
  occurredAt: string;
  source: string | null;
  sourceId: string | null;
  note: string | null;
  createdById: string | null;
}
