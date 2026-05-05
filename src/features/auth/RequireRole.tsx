import type { ReactNode } from 'react';
import { Alert } from 'antd';

import { hasRole } from '../../shared/utils/permissions';
import { useAuthStore } from './authStore';

export function RequireRole({
  roles,
  children,
}: {
  roles: string | string[];
  children: ReactNode;
}) {
  const userRoles = useAuthStore((state) => state.user?.roles);

  if (!hasRole(userRoles, roles)) {
    return <Alert type="warning" message="Bạn không có quyền truy cập nội dung này." showIcon />;
  }

  return <>{children}</>;
}
