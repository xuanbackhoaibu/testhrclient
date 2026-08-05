import { Result } from 'antd';
import { Navigate } from 'react-router-dom';

import { getPostLoginDestination } from './postLoginDestination';
import { useAuth } from './useAuth';

export function AuthorizationLanding() {
  const { user } = useAuth();
  const destination = getPostLoginDestination(user);

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
