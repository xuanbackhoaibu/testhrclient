import { api } from '../../shared/api/httpClient';
import type { ListQueryParams } from '../../shared/types/api';

function toDownloadParams(params: ListQueryParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

export function downloadHrmCoreTemplate() {
  return api.download('/import-templates/hrm-core', 'Mau_import_HRM_Core.xlsx');
}

export function downloadHrmCoreErrors(batchId: string) {
  return api.download(`/imports/hrm-core/${batchId}/errors.xlsx`, `hrm-core-errors-${batchId}.xlsx`);
}

export function downloadUnitsExport(params: ListQueryParams = {}) {
  return api.download(
    '/units/export',
    `hrm-units-${new Date().toISOString().slice(0, 10)}.xlsx`,
    toDownloadParams(params),
  );
}

export function downloadDepartmentsExport(params: ListQueryParams = {}) {
  return api.download(
    '/departments/export',
    `hrm-departments-${new Date().toISOString().slice(0, 10)}.xlsx`,
    toDownloadParams(params),
  );
}

export function downloadEmployeesExport(params: ListQueryParams = {}) {
  return api.download(
    '/employees/export',
    `hrm-employees-${new Date().toISOString().slice(0, 10)}.xlsx`,
    toDownloadParams(params),
  );
}

export function downloadPositionsExport(params: ListQueryParams = {}) {
  return api.download(
    '/positions/export',
    `hrm-positions-${new Date().toISOString().slice(0, 10)}.xlsx`,
    toDownloadParams(params),
  );
}
