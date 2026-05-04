import type { ReactNode } from 'react';
import { Result } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';

import { ROUTES } from '../../shared/constants/routes';
import { LoadingState } from '../../shared/components/LoadingState';
import { hasAnyRole, type HrmRole } from './permissions';
import { useAuth } from './useAuth';

export function ProtectedRoute({
  children,
  roles,
  permissions,
}: {
  children: ReactNode;
  roles?: HrmRole[];
  permissions?: string[];
}) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user, canAll } = useAuth();

  if (isLoading) {
    return <LoadingState tip="Đang kiểm tra phiên đăng nhập..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
    );
  }

  if (user?.mustChangePassword === true && location.pathname !== ROUTES.changePassword) {
    return <Navigate to={ROUTES.changePassword} replace />;
  }

  if (roles?.length && !hasAnyRole(user, roles)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập chức năng này."
      />
    );
  }

  if (permissions?.length && !canAll(permissions)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập chức năng này."
      />
    );
  }

  return <>{children}</>;
}
