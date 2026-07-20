import type { PermissionDefinition } from './authAdminTypes';
import type { Permission } from './accountAuthorizationTypes';

export const WORK_REPORT_MANAGED_ASSIGNMENT_MESSAGE =
  'Quyền này được quản lý từ nghiệp vụ Báo cáo công việc của HRM và không thể cấp trực tiếp tại đây.';

export class DirectPermissionAssignmentError extends Error {
  readonly code = 'DIRECT_PERMISSION_NOT_ASSIGNABLE';
  readonly invalidKeys: string[];

  constructor(invalidKeys: string[]) {
    super(WORK_REPORT_MANAGED_ASSIGNMENT_MESSAGE);
    this.name = 'DirectPermissionAssignmentError';
    this.invalidKeys = invalidKeys;
  }
}

export function isWorkReportManagedPermission(permission: Pick<Permission, 'code' | 'source'>): boolean {
  return permission.code.startsWith('work_report.') || permission.source === 'HRM_MANAGED';
}

export function normalizePermissionCatalogItem(definition: PermissionDefinition): Permission {
  const code = definition.key;
  const [system = 'unknown', module = 'general', action = 'read'] = code.split('.');
  const status = definition.status?.toLowerCase();

  return {
    id: definition.id,
    code,
    name: definition.name ?? code,
    system: definition.system ?? definition.domain ?? system,
    module: definition.module ?? module,
    action: definition.action ?? action,
    description: definition.description ?? undefined,
    active: status !== 'disabled' && status !== 'inactive',
    assignable: definition.assignable !== false,
    isSensitive: definition.isSensitive === true,
    source: definition.source ?? undefined,
  };
}

export function isDirectlyAssignablePermission(
  permission: Pick<Permission, 'code' | 'active' | 'assignable'>,
): boolean {
  return permission.active === true && permission.assignable === true && !permission.code.startsWith('work_report.');
}

export type DirectPermissionValidationResult =
  | { valid: true; permissions: Permission[] }
  | { valid: false; invalidKeys: string[] };

export function validateDirectPermissionKeys(
  selectedKeys: string[],
  catalog: Permission[],
): DirectPermissionValidationResult {
  const byCode = new Map(catalog.map((permission) => [permission.code, permission]));
  const invalidKeys = selectedKeys.filter((key) => {
    const permission = byCode.get(key);
    return !permission || !isDirectlyAssignablePermission(permission);
  });

  if (invalidKeys.length > 0) {
    return { valid: false, invalidKeys: [...new Set(invalidKeys)].sort() };
  }

  return {
    valid: true,
    permissions: selectedKeys.map((key) => byCode.get(key)!),
  };
}

export function assertDirectlyAssignablePermissions(
  selectedKeys: string[],
  catalog: Permission[],
): Permission[] {
  const result = validateDirectPermissionKeys(selectedKeys, catalog);
  if (!result.valid) {
    throw new DirectPermissionAssignmentError(result.invalidKeys);
  }
  return result.permissions;
}
