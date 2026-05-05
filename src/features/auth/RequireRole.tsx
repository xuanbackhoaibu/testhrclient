import type { ReactNode } from 'react';
import { Alert } from 'antd';

import { hasRole } from './permissions';
import { useAuth } from './useAuth';

export function RequireRole({
  roles,
  children,
}: {
  roles: string | string[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  const expectedRoles = Array.isArray(roles) ? roles : [roles];

  if (!expectedRoles.some((role) => hasRole(user, role))) {
    return <Alert type="warning" message="Ban khong co quyen truy cap noi dung nay." showIcon />;
  }

  return <>{children}</>;
}
