import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ROUTES } from '../../shared/constants/routes';
import { LoadingState } from '../../shared/components/LoadingState';
import { useAuthStore } from './authStore';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingState tip="Đang kiểm tra phiên đăng nhập..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

