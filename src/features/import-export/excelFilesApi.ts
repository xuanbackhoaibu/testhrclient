import { api } from '../../shared/api/httpClient';
import type { ListQueryParams } from '../../shared/types/api';
import { listEmployees } from '../employees/employeesApi';
import type { Employee } from '../employees/employeeTypes';
import { exportRowsToExcel } from '../../shared/utils/excel';

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  NOT_CREATED: 'Chưa tạo',
  ACTIVE: 'Đã cấp',
  PENDING_ACTIVATION: 'Chờ kích hoạt',
  LOCKED: 'Bị khóa',
  DISABLED: 'Vô hiệu hóa',
  DEACTIVATED: 'Vô hiệu hóa',
  TOMBSTONED: 'Đã xóa',
  UNKNOWN: 'Không rõ trạng thái',
};

export type ExcelDomainKey =
  | 'organization-units'
  | 'departments'
  | 'positions'
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
    positions: 'Mau_import_ChucVu.xlsx',
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

export async function downloadEmployeesExport(params: ListQueryParams = {}): Promise<void> {
  const pageSize = 100;
  const allItems: Employee[] = [];

  const first = await listEmployees({ ...params, pageSize, page: 1 });
  allItems.push(...first.items);

  const totalPages = first.pagination?.totalPages ?? 1;
  for (let page = 2; page <= totalPages; page++) {
    const { items } = await listEmployees({ ...params, pageSize, page });
    allItems.push(...items);
  }

  const date = new Date().toISOString().slice(0, 10);
  await exportRowsToExcel<Employee>({
    fileName: `hrm-employees-${date}.xlsx`,
    sheetName: 'NhanSu',
    columns: [
      { header: 'Mã NS', key: 'employeeCode', width: 14, value: (r) => r.employeeCode },
      { header: 'Mã chấm công', key: 'biotimeEmployeeCode', width: 16, value: (r) => r.biotimeEmployeeCode ?? '' },
      { header: 'Họ tên', key: 'fullName', width: 28, value: (r) => r.fullName },
      { header: 'Email công ty', key: 'companyEmail', width: 34, value: (r) => r.companyEmail ?? '' },
      { header: 'Email cá nhân', key: 'personalEmail', width: 34, value: (r) => r.personalEmail ?? '' },
      { header: 'Số điện thoại', key: 'phone', width: 16, value: (r) => r.phone ?? '' },
      {
        header: 'TT nhân sự', key: 'employmentStatus', width: 18,
        value: (r) => r.employmentStatus,
      },
      {
        header: 'TT tài khoản', key: 'accountStatus', width: 18,
        value: (r) => {
          const status = r.accountStatus ?? 'NOT_CREATED';
          return r.accountDisplayStatus ?? ACCOUNT_STATUS_LABELS[status] ?? status;
        },
      },
      { header: 'Đơn vị', key: 'unit', width: 30, value: (r) => r.currentEmployeeAssignment?.unitName ?? r.unitName ?? '' },
      { header: 'mã đơn vị', key: 'unitCode', width: 14, value: (r) => r.currentEmployeeAssignment?.unitCode ?? '' },
      { header: 'Phòng ban', key: 'department', width: 26, value: (r) => r.currentEmployeeAssignment?.departmentName ?? '' },
      { header: 'Mã Phòng ban', key: 'departmentCode', width: 16, value: (r) => r.currentEmployeeAssignment?.departmentCode ?? '' },
      { header: 'Chức danh', key: 'jobTitle', width: 24, value: (r) => r.currentEmployeeAssignment?.positionName ?? r.currentEmployeeAssignment?.jobTitle ?? '' },
      { header: 'Giới tính', key: 'gender', width: 10, value: (r) => r.gender ?? '' },
      { header: 'Ngày sinh', key: 'dateOfBirth', width: 14, value: (r) => formatDate(r.dateOfBirth) },
      { header: 'Ngày vào làm', key: 'hireDate', width: 14, value: (r) => formatDate(r.hireDate) },
    ],
    rows: allItems,
  });
}

export function downloadPositionsExport(params: ListQueryParams = {}) {
  return api.download(
    '/positions/export',
    `hrm-positions-${new Date().toISOString().slice(0, 10)}.xlsx`,
    toDownloadParams(params),
  );
}
