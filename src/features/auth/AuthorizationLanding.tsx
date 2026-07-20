import { Result } from 'antd';
import { Navigate } from 'react-router-dom';

import { ROUTES } from '../../shared/constants/routes';
import { canAccessRoute } from './routePolicies';
import { useAuth } from './useAuth';

const LANDING_ROUTES = [
  ROUTES.dashboard,
  ROUTES.employees,
  ROUTES.businessSectors,
  ROUTES.units,
  ROUTES.departments,
  ROUTES.positions,
  ROUTES.attendance,
  ROUTES.calendar,
  ROUTES.imports,
  ROUTES.accounts,
  ROUTES.roles,
  ROUTES.permissions,
  ROUTES.permissionGroups,
  ROUTES.settings,
] as const;

export function AuthorizationLanding() {
  const { user } = useAuth();
  const destination = LANDING_ROUTES.find((route) => canAccessRoute(user, route));

  return destination ? (
    <Navigate to={destination} replace />
  ) : (
    <Result
      status="403"
      title="Không có màn hình được cấp quyền"
      subTitle="Tài khoản đã xác thực nhưng chưa có permission cho bất kỳ route HRM nào."
    />
  );
}
