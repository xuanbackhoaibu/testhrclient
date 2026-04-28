import { api } from '../../shared/api/httpClient';
import type { ListQueryParams } from '../../shared/types/api';

export type ExcelDomainKey =
  | 'organization-units'
  | 'departments'
  | 'employees'
  | 'employee-assignments';

function toDownloadParams(params: ListQueryParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

export function downloadHrmCoreTemplate() {
  return api.download('/import-templates/hrm-core', 'Mau_import_HRM_Core.xlsx');
}

export function downloadImportTemplate(domainKey: ExcelDomainKey) {
  const fallbackByDomain: Record<ExcelDomainKey, string> = {
    'organization-units': 'Mau_import_DonVi.xlsx',
    departments: 'Mau_import_PhongBan.xlsx',
    employees: 'Mau_import_NhanSu.xlsx',
    'employee-assignments': 'Mau_import_PhanCongNhanSu.xlsx',
  };
  return api.download(`/import-templates/${domainKey}`, fallbackByDomain[domainKey]);
}

export function downloadHrmCoreErrors(batchId: string) {
  return api.download(`/imports/hrm-core/${batchId}/errors.xlsx`, `hrm-core-errors-${batchId}.xlsx`);
}

export function downloadImportErrorReport(batchId: string) {
  return api.download(`/imports/${batchId}/error-report`, `import-errors-${batchId}.xlsx`);
}

export function downloadDomainExport(domainKey: ExcelDomainKey, params: ListQueryParams = {}) {
  return api.download(
    `/exports/${domainKey}`,
    `hrm-export-${domainKey}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    toDownloadParams(params),
  );
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
