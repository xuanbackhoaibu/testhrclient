import { httpClient } from '../../shared/api/httpClient';
import { normalizePaginatedResponse, unwrapApiResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockImportBatches } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedResponse } from '../../shared/types/api';
import type { HrmCorePreview, HrmCoreStagingRow, ImportBatch } from './importTypes';

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
  const response = await httpClient.post('/imports/employees/csv', formData);
  return unwrapApiResponse<ImportBatch>(response.data);
}

export async function importAttendanceCsv(file: File) {
  if (isMockMode) {
    return createMockBatch(file, 'ATTENDANCE');
  }

  const formData = new FormData();
  formData.append('file', file);
  const response = await httpClient.post('/imports/attendance/csv', formData);
  return unwrapApiResponse<ImportBatch>(response.data);
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

  const response = await httpClient.get('/imports/batches', { params });
  return normalizePaginatedResponse<ImportBatch>(response.data, params);
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

  const response = await httpClient.get(`/imports/batches/${id}`);
  return unwrapApiResponse<ImportBatch>(response.data);
}

export async function previewHrmCoreImport(file: File): Promise<HrmCorePreview> {
  if (isMockMode) {
    const batch = await createMockBatch(file, 'HRM_CORE_EXCEL');
    return {
      batchId: batch.id,
      status: 'PREVIEWED',
      summary: { units: 2, departments: 3, employees: 12, assignments: 12, errors: 0, warnings: 1 },
      suggestedCodes: {
        units: [{ key: 'HACOM', name: 'HACOM', code: 'HC' }],
        departments: [{ key: 'HACOM:NHAN SU', name: 'Nhan su', code: 'NS', unitKey: 'HACOM' }],
      },
      canCommit: true,
    };
  }

  const formData = new FormData();
  formData.append('file', file);
  const response = await httpClient.post('/imports/hrm-core/preview', formData);
  return unwrapApiResponse<HrmCorePreview>(response.data);
}

export async function getHrmCorePreview(batchId: string): Promise<HrmCorePreview> {
  if (isMockMode) {
    return {
      batchId,
      status: 'PREVIEWED',
      summary: { units: 2, departments: 3, employees: 12, assignments: 12, errors: 0, warnings: 0 },
      suggestedCodes: { units: [], departments: [] },
      canCommit: true,
    };
  }

  const response = await httpClient.get(`/imports/hrm-core/${batchId}`);
  return unwrapApiResponse<HrmCorePreview>(response.data);
}

export async function listHrmCoreRows(batchId: string, status?: string): Promise<HrmCoreStagingRow[]> {
  if (isMockMode) {
    await mockDelay();
    return [];
  }

  const response = await httpClient.get(`/imports/hrm-core/${batchId}/rows`, { params: { status } });
  return response.data.data as HrmCoreStagingRow[];
}

export async function updateHrmCoreSuggestedCodes(
  batchId: string,
  payload: { units?: Array<{ key: string; code: string }>; departments?: Array<{ key: string; code: string }> },
): Promise<HrmCorePreview> {
  if (isMockMode) {
    return getHrmCorePreview(batchId);
  }

  const response = await httpClient.patch(`/imports/hrm-core/${batchId}/suggested-codes`, payload);
  return unwrapApiResponse<HrmCorePreview>(response.data);
}

export async function commitHrmCoreImport(batchId: string, allowWarnings: boolean): Promise<{ batchId: string; status: string }> {
  if (isMockMode) {
    await mockDelay();
    return { batchId, status: 'COMMITTED' };
  }

  const response = await httpClient.post(`/imports/hrm-core/${batchId}/commit`, { allowWarnings });
  return unwrapApiResponse<{ batchId: string; status: string }>(response.data);
}

export async function rollbackHrmCoreImport(batchId: string): Promise<{ batchId: string; status: string }> {
  if (isMockMode) {
    await mockDelay();
    return { batchId, status: 'ROLLED_BACK' };
  }

  const response = await httpClient.post(`/imports/hrm-core/${batchId}/rollback`);
  return unwrapApiResponse<{ batchId: string; status: string }>(response.data);
}

export async function downloadBlob(path: string, fileName: string) {
  const response = await httpClient.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
