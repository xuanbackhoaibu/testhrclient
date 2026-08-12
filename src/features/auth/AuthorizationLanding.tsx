import { Navigate } from 'react-router-dom';

import { AuthStatePage } from '../../shared/components/AuthStatePage';
import { getPostLoginDestination } from './postLoginDestination';
import { useAuth } from './useAuth';

export function AuthorizationLanding() {
  const { user } = useAuth();
  const destination = getPostLoginDestination(user);

  return destination ? (
    <Navigate to={destination} replace />
  ) : (
    <AuthStatePage
      variant="403"
      title="Không có màn hình được cấp quyền"
      description="Tài khoản đã xác thực nhưng chưa có permission cho bất kỳ route HRM nào. Vui lòng liên hệ admin để được cấp phạm vi truy cập."
    />
  );
}
