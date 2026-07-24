import type { BusinessPermission, DepartmentOption, MatrixRow, UnitOption } from './canonicalWorkReportAuthorizationsApi';

export type PermissionPresentation = BusinessPermission & {
  name: string;
  code: string;
  ownerName?: string;
  ownerCode?: string;
  scopeKind: 'department' | 'unit' | 'corporation';
  accessLabel: 'Chỉ đọc' | 'Đọc và gửi' | 'Tổng hợp báo cáo' | 'Không có quyền';
  statusLabel: 'Đang hoạt động' | 'Tạm dừng' | 'Đã thu hồi' | 'Hết hiệu lực';
};

export type EmployeePermissionViewModel = {
  employee: MatrixRow;
  defaultPermissions: string[];
  departmentPermissions: PermissionPresentation[];
  unitPermissions: PermissionPresentation[];
  corporationPermission: PermissionPresentation | null;
  summary: { departmentScopeCount: number; unitScopeCount: number; hasCorporationScope: boolean; readOnlyCount: number; readSubmitCount: number; inactiveCount: number };
};

const accessLabel = (actions: string[]): PermissionPresentation['accessLabel'] =>
  actions.includes('AGGREGATE') ? 'Tổng hợp báo cáo' : actions.includes('SUBMIT') ? 'Đọc và gửi' : actions.includes('READ') ? 'Chỉ đọc' : 'Không có quyền';
const statusLabel = (status?: BusinessPermission['status']): PermissionPresentation['statusLabel'] =>
  status === 'INACTIVE' ? 'Tạm dừng' : status === 'REVOKED' ? 'Đã thu hồi' : status === 'EXPIRED' ? 'Hết hiệu lực' : 'Đang hoạt động';

export function workReportAuthorizationToEmployeePermissionViewModel(
  employee: MatrixRow,
  departments: DepartmentOption[] = [],
  units: UnitOption[] = [],
): EmployeePermissionViewModel {
  const departmentById = new Map(departments.map((item) => [item.departmentId, item]));
  const unitById = new Map(units.map((item) => [item.unitId, item]));
  const present = (permission: BusinessPermission): PermissionPresentation => {
    const access = accessLabel(permission.actions);
    const status = statusLabel(permission.status);
    if (permission.type === 'DEPARTMENT_REPORT') {
      const scope = departmentById.get(permission.scopeId);
      return { ...permission, name: scope?.departmentName ?? 'Phòng ban đã cấp', code: scope?.departmentCode ?? '', ownerName: scope?.unitName ?? 'Đang tải đơn vị chủ quản', ownerCode: scope?.unitCode ?? '', scopeKind: 'department', accessLabel: access, statusLabel: status };
    }
    if (permission.type === 'UNIT_REPORT') {
      const scope = unitById.get(permission.scopeId);
      return { ...permission, name: scope?.unitName ?? 'Đơn vị đã cấp', code: scope?.unitCode ?? '', scopeKind: 'unit', accessLabel: access, statusLabel: status };
    }
    return { ...permission, name: 'Toàn Tổng công ty', code: 'TCT', ownerName: 'Tổng hợp báo cáo công việc toàn Tổng công ty', scopeKind: 'corporation', accessLabel: access, statusLabel: status };
  };
  const permissions = employee.permissions.map(present);
  const departmentPermissions = permissions.filter((item) => item.scopeKind === 'department');
  const unitPermissions = permissions.filter((item) => item.scopeKind === 'unit');
  const corporationPermission = permissions.find((item) => item.scopeKind === 'corporation') ?? null;
  return {
    employee, defaultPermissions: ['Báo cáo cá nhân', 'Công việc tuần'], departmentPermissions, unitPermissions, corporationPermission,
    summary: {
      departmentScopeCount: departmentPermissions.length, unitScopeCount: unitPermissions.length, hasCorporationScope: Boolean(corporationPermission),
      readOnlyCount: permissions.filter((item) => item.accessLabel === 'Chỉ đọc').length,
      readSubmitCount: permissions.filter((item) => item.accessLabel === 'Đọc và gửi').length,
      inactiveCount: permissions.filter((item) => item.statusLabel !== 'Đang hoạt động').length,
    },
  };
}
