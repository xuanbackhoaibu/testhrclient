import type { ReactNode } from 'react';
import { Alert } from '@mantine/core';

import { useAuth } from './useAuth';

interface RequirePermissionProps {
  permission: string | string[];
  mode?: 'any' | 'all';
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequirePermission({
  permission,
  mode = 'any',
  fallback = <Alert color="yellow" title="Không có quyền">Bạn không có quyền truy cập nội dung này.</Alert>,
  children,
}: RequirePermissionProps) {
  const { can, canAll, canAny } = useAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed =
    permissions.length === 1
      ? can(permissions[0])
      : mode === 'all'
        ? canAll(permissions)
        : canAny(permissions);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
