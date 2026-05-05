import { message } from 'antd';

import { queryClient } from '../../app/queryClient';
import { getCurrentUser } from './authApi';
import { clearSession, login as loginClient, logout as logoutClient, setSessionUser } from './authClient';
import { useAuthStore } from './authStore';
import { CURRENT_USER_QUERY_KEY } from './currentUser';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole as hasNormalizedRole,
} from './permissions';
import type { DemoRole, LoginCredentials } from './types';

function readHttpStatus(error: unknown): number | undefined {
  return (
    (error as { statusCode?: number })?.statusCode ??
    (error as { response?: { status?: number } })?.response?.status
  );
}

export function useAuth() {
  const store = useAuthStore();
  const user = store.user;

  async function refreshCurrentUser(): Promise<void> {
    try {
      const freshUser = await getCurrentUser();
      setSessionUser(freshUser);
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      useAuthStore.getState().setError(null);
    } catch (error: unknown) {
      const status = readHttpStatus(error);
      const errorCode = (error as { errorCode?: string })?.errorCode;
      if (status === 403 && errorCode === 'CHANGE_PASSWORD_REQUIRED') {
        // Keep session; redirect will happen via ProtectedRoute or interceptor
        return;
      }

      if (status === 403) {
        clearSession();
        useAuthStore.getState().setError('Tài khoản đã xác thực nhưng chưa được cấp quyền HRM.');
        message.error('Tài khoản đã xác thực nhưng chưa được cấp quyền HRM.');
        return;
      }

      if (status === 401) {
        clearSession();
        return;
      }

      useAuthStore.getState().setError('Không tải được thông tin người dùng HRM.');
    }
  }

  async function login(input?: DemoRole | LoginCredentials): Promise<void> {
    await loginClient(input);
  }

  function logout(): void {
    void logoutClient();
  }

  function hasRole(role: string): boolean {
    return hasNormalizedRole(user, role as never);
  }

  function can(permission: string): boolean {
    return hasPermission(user, permission);
  }

  function hasAnyPermissionForUser(permissions: string[]): boolean {
    return hasAnyPermission(user, permissions);
  }

  function hasAllPermissionsForUser(permissions: string[]): boolean {
    return hasAllPermissions(user, permissions);
  }

  return {
    user,
    roles: user?.roles ?? [],
    permissions: user?.permissions ?? [],
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login,
    logout,
    refreshCurrentUser,
    hasRole,
    hasPermission: can,
    hasAnyPermission: hasAnyPermissionForUser,
    hasAllPermissions: hasAllPermissionsForUser,
    can,
    canAny: hasAnyPermissionForUser,
    canAll: hasAllPermissionsForUser,
  };
}
