import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ROUTES } from '../../shared/constants/routes';
import { AuthStatePage } from '../../shared/components/AuthStatePage';
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
      <AuthStatePage
        variant="session"
        title="Không thể xác minh phiên làm việc"
        description={error ?? 'Dịch vụ authority hiện không khả dụng. Bạn có thể thử tải lại quyền hoặc đăng nhập lại để tiếp tục.'}
        primaryLabel="Đăng nhập lại"
        secondaryLabel="Thử lại"
        onPrimary={() => window.location.assign(`${ROUTES.login}?next=${encodeURIComponent(location.pathname)}`)}
        onSecondary={() => void refreshCurrentUser()}
      />
    );
  }

  if (user.accountStatus !== 'ACTIVE') {
    return (
      <AuthStatePage
        variant="403"
        title="Tài khoản không hoạt động"
        description="Trạng thái tài khoản hiện tại không cho phép truy cập HRM. Vui lòng liên hệ quản trị viên để kiểm tra."
      />
    );
  }

  if (user?.mustChangePassword === true && location.pathname !== ROUTES.changePassword) {
    return <Navigate to={ROUTES.changePassword} replace />;
  }

  const routePolicy = route ? getRoutePolicy(route) : null;
  if (route === ROUTES.dashboard && !isSuperAdmin(user)) {
    return (
      <AuthStatePage
        variant="404"
        title="Dashboard chưa được mở cho tài khoản này"
        description="Không tìm thấy màn hình dashboard phù hợp với quyền hiện tại. Hệ thống chỉ hiển thị các module đã được cấp quyền."
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
      <AuthStatePage
        variant="403"
        title="Chức năng chưa được cấp policy"
        description={routePolicy.reason}
      />
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
      <AuthStatePage
        variant="403"
        title="Bạn không có quyền truy cập"
        description="Tài khoản hiện tại chưa được cấp permission cho chức năng này. Hãy liên hệ admin nếu đây là công việc bạn cần xử lý."
      />
    );
  }

  return <>{children}</>;
}
