type ScopeLike = {
  type?: string;
  scopeType?: string;
  departmentIds?: string[];
  unitIds?: string[];
  employeeIds?: string[];
  departmentId?: string | null;
  unitId?: string | null;
  resourceIds?: string[];
};

type AccessModuleDefinition = {
  key: string;
  label: string;
  description: string;
  matches: (permission: string) => boolean;
};

export type AccessModuleSummary = {
  key: string;
  label: string;
  description: string;
  permissionCodes: string[];
  actions: string[];
};

const EMPLOYEE_ACCOUNT_AUTH_PERMISSIONS = new Set([
  'auth.user.read',
  'auth.user.provision',
  'auth.user.update_status',
  'auth.user.revoke_sessions',
  'auth.user.send_activation',
]);

const ACCESS_MODULES: AccessModuleDefinition[] = [
  {
    key: 'personnel',
    label: 'Nhân sự',
    description: 'Hồ sơ, điều chuyển, hợp đồng, onboarding, offboarding và phân công.',
    matches: (permission) =>
      [
        'hr.dashboard.',
        'hr.employee.',
        'hr.movement.',
        'hr.contract.',
        'hr.onboarding.',
        'hr.offboarding.',
        'hr.assignment.',
      ].some((prefix) => permission.startsWith(prefix)),
  },
  {
    key: 'organization',
    label: 'Tổ chức',
    description: 'Lĩnh vực, đơn vị, phòng ban và chức danh.',
    matches: (permission) =>
      [
        'hr.business_sector.',
        'hr.unit.',
        'hr.department.',
        'hr.position.',
      ].some((prefix) => permission.startsWith(prefix)),
  },
  {
    key: 'attendance',
    label: 'Chấm công',
    description: 'Dữ liệu máy chấm công, ca, phân ca, kỳ công, bảng công, nghỉ phép và ngày lễ.',
    matches: (permission) =>
      permission.startsWith('hr.attendance.') ||
      permission.startsWith('hr.leave.'),
  },
  {
    key: 'employee-accounts',
    label: 'Tài khoản nhân viên',
    description: 'Tạo và vận hành tài khoản đăng nhập gắn với hồ sơ nhân sự.',
    matches: (permission) =>
      (permission.startsWith('hr.account.') &&
        !['hr.account.assign_role', 'hr.account.assign_permission'].includes(
          permission,
        )) ||
      EMPLOYEE_ACCOUNT_AUTH_PERMISSIONS.has(permission),
  },
  {
    key: 'calendar',
    label: 'Lịch HR',
    description: 'Lịch cá nhân và lịch nhân sự trong phạm vi được giao.',
    matches: (permission) => permission.startsWith('hr.calendar.'),
  },
  {
    key: 'hr-audit',
    label: 'Nhật ký HR',
    description: 'Theo dõi lịch sử thao tác nghiệp vụ nhân sự.',
    matches: (permission) => permission === 'hr.audit.read',
  },
  {
    key: 'account-authorization',
    label: 'Phân quyền tài khoản',
    description: 'Vai trò, nhóm quyền, quyền trực tiếp và phạm vi dữ liệu.',
    matches: (permission) =>
      permission.startsWith('auth.role.') ||
      permission.startsWith('auth.permission.') ||
      permission.startsWith('auth.permission_group.') ||
      permission.startsWith('auth.authorization.') ||
      [
        'auth.user.assign_role',
        'auth.user.assign_permission',
        'auth.user.assign_sensitive_role',
        'auth.user.revoke_sensitive_role',
        'auth.user.assign_sensitive_permission',
        'auth.user.assign_sensitive_group',
        'auth.user.assign_scope',
        'hr.account.assign_role',
        'hr.account.assign_permission',
      ].includes(permission),
  },
  {
    key: 'work-report-authorization',
    label: 'Phân quyền Báo cáo công việc',
    description: 'Phạm vi báo cáo cá nhân, phòng ban, đơn vị và Tổng công ty.',
    matches: (permission) =>
      permission.startsWith('admin.work_report_authorization.'),
  },
];

const ACTION_LABELS: Record<string, string> = {
  read: 'Xem',
  create: 'Tạo',
  update: 'Sửa',
  delete: 'Xóa',
  import: 'Import',
  export: 'Export',
  manage: 'Quản lý',
  approve: 'Duyệt',
  reject: 'Từ chối',
  submit: 'Trình duyệt',
  cancel: 'Hủy',
  complete: 'Hoàn tất',
  terminate: 'Chấm dứt',
  end: 'Kết thúc',
  write: 'Tạo và sửa',
  sync: 'Đồng bộ',
  lock: 'Khóa',
  deactivate: 'Vô hiệu',
  restore: 'Khôi phục',
  reset_password: 'Reset mật khẩu',
  provision: 'Cấp tài khoản',
  update_status: 'Đổi trạng thái',
  revoke_sessions: 'Thu hồi phiên',
  send_activation: 'Gửi kích hoạt',
  assign_role: 'Gán vai trò',
  assign_permission: 'Gán quyền',
  audit: 'Xem nhật ký',
};

function actionLabel(permission: string): string {
  if (permission.endsWith('sync_log.read')) return 'Xem nhật ký đồng bộ';
  if (permission.endsWith('view_others')) return 'Xem dữ liệu người khác';
  if (permission.endsWith('export_sensitive')) return 'Export dữ liệu nhạy cảm';

  const action = permission.split('.').at(-1) ?? permission;
  return ACTION_LABELS[action] ?? action.replaceAll('_', ' ');
}

export function summarizeEffectiveAccess(
  permissions: readonly string[],
): AccessModuleSummary[] {
  const normalized = [...new Set(permissions.filter(Boolean))];
  const wildcard = normalized.includes('*');
  const matched = new Set<string>();

  const summaries = ACCESS_MODULES.flatMap((module) => {
    const permissionCodes = wildcard
      ? []
      : normalized.filter((permission) => {
          const matches = module.matches(permission);
          if (matches) matched.add(permission);
          return matches;
        });

    if (!wildcard && permissionCodes.length === 0) return [];

    return [{
      key: module.key,
      label: module.label,
      description: module.description,
      permissionCodes,
      actions: wildcard
        ? ['Toàn quyền']
        : [...new Set(permissionCodes.map(actionLabel))].sort((a, b) =>
            a.localeCompare(b, 'vi'),
          ),
    }];
  });

  const unmatched = normalized.filter(
    (permission) => permission !== '*' && !matched.has(permission),
  );
  if (unmatched.length > 0) {
    summaries.push({
      key: 'other',
      label: 'Quyền hệ thống khác',
      description: 'Các quyền hiệu lực không thuộc nhóm nghiệp vụ HRM tiêu chuẩn.',
      permissionCodes: unmatched,
      actions: [...new Set(unmatched.map(actionLabel))].sort((a, b) =>
        a.localeCompare(b, 'vi'),
      ),
    });
  }

  return summaries;
}

function countScopeResources(scope: ScopeLike): number {
  return Math.max(
    scope.departmentIds?.length ?? 0,
    scope.unitIds?.length ?? 0,
    scope.employeeIds?.length ?? 0,
    scope.resourceIds?.length ?? 0,
    scope.departmentId ? 1 : 0,
    scope.unitId ? 1 : 0,
  );
}

export function describeAccessScopes(scopes: readonly ScopeLike[]): string[] {
  if (scopes.length === 0) return ['Chưa xác định phạm vi dữ liệu'];

  const labels = scopes.map((scope) => {
    const type = (scope.type ?? scope.scopeType ?? '').toUpperCase();
    const count = countScopeResources(scope);

    if (type === 'ALL' || type === 'GLOBAL') return 'Toàn Tổng công ty';
    if (type === 'SELF') return 'Chỉ dữ liệu bản thân';
    if (type === 'UNIT') return count ? `${count} đơn vị được phân` : 'Đơn vị được phân';
    if (type === 'DEPARTMENT') {
      return count ? `${count} phòng ban được phân` : 'Phòng ban được phân';
    }
    if (type === 'EMPLOYEE') {
      return count ? `${count} nhân sự cụ thể` : 'Nhân sự được phân';
    }
    return type || 'Phạm vi chuyên biệt';
  });

  return [...new Set(labels)];
}

export function roleBusinessLabel(role: string): string {
  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    hr_admin: 'Quản trị HRM',
    hr_staff: 'Nhân viên HR',
    hr_viewer: 'Chỉ xem HRM',
    operator: 'Vận hành hệ thống',
    viewer: 'Chỉ xem hệ thống',
  };
  return labels[normalized] ?? role;
}
