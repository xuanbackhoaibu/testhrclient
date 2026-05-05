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

