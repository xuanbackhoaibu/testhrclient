import { queryClient } from '../../app/queryClient';
import { getCurrentUser } from './authApi';
import { clearSession, login as loginClient, logout as logoutClient, setSessionUser } from './authClient';
import { useAuthStore } from './authStore';
import { CURRENT_USER_QUERY_KEY } from './currentUser';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from './permissions';
import type { DemoRole, LoginCredentials } from './types';
import { toast } from '../../shared/utils/toast';
import { readHttpStatus } from '../../shared/api/response';
import { isDefinitiveAuthRefreshFailure } from '../../shared/api/authRefreshFailure';


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
        setSessionUser(null);
        useAuthStore.getState().setError('Tài khoản đã xác thực nhưng không được phép thực hiện thao tác này.');
        toast.error('Bạn không có quyền thực hiện thao tác này.');
        return;
      }

      if (status === 401 && isDefinitiveAuthRefreshFailure(error)) {
        clearSession();
        return;
      }

      setSessionUser(null);
      useAuthStore.getState().setError('Không thể xác minh quyền hiện tại. Vui lòng thử lại.');
    }
  }

  async function login(input?: DemoRole | LoginCredentials) {
    return loginClient(input);
  }

  function logout(): void {
    void logoutClient();
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
    hasPermission: can,
    hasAnyPermission: hasAnyPermissionForUser,
    hasAllPermissions: hasAllPermissionsForUser,
    can,
    canAny: hasAnyPermissionForUser,
    canAll: hasAllPermissionsForUser,
  };
}
