import type { PermissionDisplayMetadata } from '../types/authorization.types';

const KNOWN_LABELS: Record<string, Omit<PermissionDisplayMetadata, 'isFallback'>> = {
  'auth.role.manage': { label: 'Quản lý vai trò', description: 'Tạo và chỉnh sửa định nghĩa vai trò.', moduleLabel: 'Phân quyền' },
  'auth.user.assign_role': { label: 'Gán vai trò cho tài khoản', description: 'Cấp vai trò đã tồn tại cho người dùng.', moduleLabel: 'Phân quyền' },
  'auth.user.assign_permission': { label: 'Cấp quyền riêng', description: 'Cấp hoặc từ chối quyền trực tiếp.', moduleLabel: 'Phân quyền' },
  'auth.user.assign_scope': { label: 'Cấp phạm vi dữ liệu', description: 'Thiết lập phạm vi dữ liệu cho tài khoản.', moduleLabel: 'Phân quyền' },
};

function humanize(segment: string) {
  return segment.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getPermissionBusinessLabel(permissionCode: string): PermissionDisplayMetadata {
  const known = KNOWN_LABELS[permissionCode];
  if (known) return { ...known, isFallback: false };

  const [domain = 'system', resource = 'permission', action = 'read'] = permissionCode.split('.');
  return {
    label: `${humanize(action)} ${humanize(resource)}`,
    description: 'Tên quyền được tạo từ mã kỹ thuật vì backend chưa cung cấp metadata nghiệp vụ.',
    moduleLabel: humanize(domain),
    isFallback: true,
  };
}
