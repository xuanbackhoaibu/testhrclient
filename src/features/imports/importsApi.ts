import { httpClient } from '../../shared/api/httpClient';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockImportBatches } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { ImportBatch } from './importTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

async function createMockBatch(file: File, importType: string): Promise<ImportBatch> {
  await mockDelay();
  const batch: ImportBatch = {
    id: generateId('imp'),
    batchCode: `BATCH-${importType}-${new Date().getTime()}`,
    importType,
    fileName: file.name,
    totalRows: 48,
    successRows: 48,
    failedRows: 0,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    errorSummary: [],
  };
  mockImportBatches.unshift(batch);
  appendAuditLog({ entityType: 'IMPORT_BATCH', entityId: batch.id, action: 'UPLOAD', afterJson: { importType, fileName: file.name } });
  return batch;
}

export async function importEmployeesCsv(file: File) {
  if (isMockMode) {
    return createMockBatch(file, 'EMPLOYEE');
  }

  const formData = new FormData();
  formData.append('file', file);
  const response = await httpClient.post<ImportBatch>('/imports/employees', formData);
  return response.data;
}

export async function importAttendanceCsv(file: File) {
  if (isMockMode) {
    return createMockBatch(file, 'ATTENDANCE');
  }

  const formData = new FormData();
  formData.append('file', file);
  const response = await httpClient.post<ImportBatch>('/imports/attendance', formData);
  return response.data;
}

export async function listImportBatches(params: ListQueryParams = {}): Promise<PaginatedResponse<ImportBatch>> {
  if (isMockMode) {
    await mockDelay();
    const filtered = mockImportBatches.filter(
      (item) =>
        includesIgnoreCase(item.batchCode, params.search) ||
        includesIgnoreCase(item.fileName, params.search) ||
        (!params.search && true),
    ).filter((item) => (params.status ? item.status === params.status : true));

    return paginate(filtered, params);
  }

  const response = await httpClient.get<PaginatedResponse<ImportBatch>>('/imports/batches', { params });
  return response.data;
}

export async function getImportBatch(id: string): Promise<ImportBatch> {
  if (isMockMode) {
    await mockDelay();
    const batch = mockImportBatches.find((item) => item.id === id);
    if (!batch) {
      throw new Error('Import batch not found');
    }
    return batch;
  }

  const response = await httpClient.get<ImportBatch>(`/imports/batches/${id}`);
  return response.data;
}

