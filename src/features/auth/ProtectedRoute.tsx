import type { ReactNode } from 'react';
import { Button } from '@mantine/core';
import { Navigate, useLocation } from 'react-router-dom';

import { ROUTES } from '../../shared/constants/routes';
import { LoadingState } from '../../shared/components/LoadingState';
import { StatusResult } from '../../shared/components/StatusResult';
import { useAuth } from './useAuth';
import { getRoutePolicy, isSuperAdmin } from './routePolicies';

export function ProtectedRoute({
  children,
  permissions,
  route,
}: {
  children: ReactNode;
  permissions?: string[];
  route?: string;
}) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user, error, canAny, canAll, refreshCurrentUser } = useAuth();

  if (isLoading) {
    return <LoadingState tip="Đang kiểm tra phiên đăng nhập..." />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
    );
  }

  if (!user) {
    return (
      <StatusResult
        status="error"
        title="503 - Không thể xác minh quyền"
        subTitle={error ?? 'Dịch vụ authority hiện không khả dụng.'}
        extra={<Button variant="light" onClick={() => void refreshCurrentUser()}>Thử lại</Button>}
      />
    );
  }

  if (user.accountStatus !== 'ACTIVE') {
    return (
      <StatusResult
        status="403"
        title="Tài khoản không hoạt động"
        subTitle="Trạng thái tài khoản hiện tại không cho phép truy cập HRM."
      />
    );
  }

  if (user?.mustChangePassword === true && location.pathname !== ROUTES.changePassword) {
    return <Navigate to={ROUTES.changePassword} replace />;
  }

  const routePolicy = route ? getRoutePolicy(route) : null;
  if (route === ROUTES.dashboard && !isSuperAdmin(user)) {
    return (
      <StatusResult
        status="404"
        title="404"
        subTitle="Không tìm thấy màn hình dashboard cho tài khoản hiện tại."
      />
    );
  }

  if (route === ROUTES.accountAuthorizations && !isSuperAdmin(user)) {
    return (
      <StatusResult
        status="403"
        title="Chỉ Super Admin được phân quyền tài khoản"
        subTitle="Tài khoản hiện tại có thể xem dữ liệu được cấp, nhưng không thể thay đổi vai trò hoặc quyền của người khác."
      />
    );
  }

  if (routePolicy?.kind === 'unavailable') {
    return (
      <StatusResult status="403" title="Chức năng chưa được cấp policy" subTitle={routePolicy.reason} />
    );
  }
  const requiredPermissions =
    routePolicy?.kind === 'permission' ? [...routePolicy.permissions] : permissions;

  const routeAllowed =
    requiredPermissions?.length
      ? routePolicy?.kind === 'permission' && routePolicy.match === 'any'
        ? canAny(requiredPermissions)
        : canAll(requiredPermissions)
      : true;

  if (!routeAllowed) {
    return (
      <StatusResult
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập chức năng này."
      />
    );
  }

  return <>{children}</>;
}
