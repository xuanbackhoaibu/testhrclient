export interface ImportErrorSummary {
  rowNo: number;
  field: string;
  message: string;
}

export interface ImportBatch {
  id: string;
  batchCode: string;
  importType: string;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: string;
  createdAt: string;
  errorSummary: ImportErrorSummary[];
}

export interface SuggestedCode {
  key: string;
  name: string;
  code: string;
  unitKey?: string;
}

export interface HrmCoreImportSummary {
  units: number;
  departments: number;
  employees: number;
  assignments: number;
  errors: number;
  warnings: number;
}

export interface HrmCorePreview {
  batchId: string;
  status: string;
  summary: HrmCoreImportSummary;
  suggestedCodes: {
    units: SuggestedCode[];
    departments: SuggestedCode[];
  };
  canCommit: boolean;
}

export interface HrmCoreStagingRow {
  id: string;
  rowNumber: number;
  rowKind: string;
  rawDataJson: Record<string, unknown>;
  normalizedDataJson: Record<string, unknown>;
  validationStatus: string;
  validationErrorsJson: ImportErrorSummary[];
  validationWarningsJson: ImportErrorSummary[];
}
