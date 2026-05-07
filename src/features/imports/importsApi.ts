import { api } from '../../shared/api/httpClient';
import { normalizePaginatedResponse } from '../../shared/api/response';
import { appendAuditLog } from '../../shared/mocks/mockAudit';
import { paginate, includesIgnoreCase, generateId, mockDelay } from '../../shared/mocks/mockHelpers';
import { mockImportBatches } from '../../shared/mocks/mockWorkflows';
import type { ListQueryParams, PaginatedData, PaginatedResponse } from '../../shared/types/api';
import { downloadHrmCoreErrors, downloadHrmCoreTemplate, type ExcelDomainKey } from '../import-export/excelFilesApi';
import type { DomainImportPreview, HrmCorePreview, HrmCoreStagingRow, ImportBatch } from './importTypes';

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

  return api.upload<ImportBatch>('/imports/employees/csv', file);
}

export async function importAttendanceCsv(file: File) {
  if (isMockMode) {
    return createMockBatch(file, 'ATTENDANCE');
  }

  return api.upload<ImportBatch>('/imports/attendance/csv', file);
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

  const response = await api.get<PaginatedData<ImportBatch>>('/imports/batches', { params });
  return normalizePaginatedResponse<ImportBatch>(response, params);
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

  return api.get<ImportBatch>(`/imports/batches/${id}`);
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
        departments: [{ key: 'HACOM:NHAN SU', name: 'Nhân sự', code: 'NS', unitKey: 'HACOM', unitName: 'HACOM' }],
      },
      canCommit: true,
    };
  }

  return api.upload<HrmCorePreview>('/imports/hrm-core/preview', file);
}

export async function previewDomainImport(domainKey: ExcelDomainKey, file: File): Promise<DomainImportPreview> {
  if (isMockMode) {
    const batch = await createMockBatch(file, `${domainKey.toUpperCase()}_EXCEL`);
    return {
      jobId: batch.id,
      batchId: batch.id,
      importType: batch.importType,
      status: 'PREVIEWED',
      totalRows: 12,
      validRows: 12,
      invalidRows: 0,
      warnings: 0,
      warningRows: 0,
      errors: [],
      canCommit: true,
    };
  }

  return api.upload<DomainImportPreview>(`/imports/${domainKey}/preview`, file);
}

export async function listDomainImportRows(batchId: string, domainKey: ExcelDomainKey, status?: string): Promise<HrmCoreStagingRow[]> {
  if (isMockMode) {
    await mockDelay();
    return [];
  }

  return api.get<HrmCoreStagingRow[]>(`/imports/${domainKey}/${batchId}/rows`, { params: { status } });
}

export async function commitDomainImport(
  domainKey: ExcelDomainKey,
  batchId: string,
  allowWarnings: boolean,
): Promise<{ batchId: string; jobId: string; status: string }> {
  if (isMockMode) {
    await mockDelay();
    return { batchId, jobId: batchId, status: 'COMMITTED' };
  }

  return api.post<{ batchId: string; jobId: string; status: string }>(`/imports/${domainKey}/${batchId}/commit`, {
    allowWarnings,
  });
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

  return api.get<HrmCorePreview>(`/imports/hrm-core/${batchId}`);
}

export async function listHrmCoreRows(batchId: string, status?: string): Promise<HrmCoreStagingRow[]> {
  if (isMockMode) {
    await mockDelay();
    return [];
  }

  return api.get<HrmCoreStagingRow[]>(`/imports/hrm-core/${batchId}/rows`, { params: { status } });
}

export async function updateHrmCoreSuggestedCodes(
  batchId: string,
  payload: { units?: Array<{ key: string; code: string }>; departments?: Array<{ key: string; code: string }> },
): Promise<HrmCorePreview> {
  if (isMockMode) {
    return getHrmCorePreview(batchId);
  }

  return api.patch<HrmCorePreview>(`/imports/hrm-core/${batchId}/suggested-codes`, payload);
}

export async function commitHrmCoreImport(batchId: string, allowWarnings: boolean): Promise<{ batchId: string; status: string }> {
  if (isMockMode) {
    await mockDelay();
    return { batchId, status: 'COMMITTED' };
  }

  return api.post<{ batchId: string; status: string }>(`/imports/hrm-core/${batchId}/commit`, { allowWarnings });
}

export async function rollbackHrmCoreImport(batchId: string): Promise<{ batchId: string; status: string }> {
  if (isMockMode) {
    await mockDelay();
    return { batchId, status: 'ROLLED_BACK' };
  }

  return api.post<{ batchId: string; status: string }>(`/imports/hrm-core/${batchId}/rollback`);
}

export async function downloadBlob(path: string, fileName: string) {
  return api.download(path, fileName);
}

export { downloadHrmCoreErrors, downloadHrmCoreTemplate };
