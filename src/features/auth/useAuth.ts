import { message } from 'antd';

import { getCurrentUser } from './authApi';
import { clearSession, getStoredUser, login as loginClient, logout as logoutClient, setSessionUser } from './authClient';
import { useAuthStore } from './authStore';
import { hasRole as hasNormalizedRole } from './permissions';
import type { DemoRole, LoginCredentials } from './types';

function readHttpStatus(error: unknown): number | undefined {
  return (
    (error as { statusCode?: number })?.statusCode ??
    (error as { response?: { status?: number } })?.response?.status
  );
}

export function useAuth() {
  const store = useAuthStore();
  const user = store.user ?? getStoredUser();

  async function refreshCurrentUser(): Promise<void> {
    try {
      const freshUser = await getCurrentUser();
      setSessionUser(freshUser);
      useAuthStore.getState().setError(null);
    } catch (error: unknown) {
      const status = readHttpStatus(error);
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
    const perms = user?.permissions;
    if (!perms?.length) return false;
    return perms.includes('*') || perms.includes(permission);
  }

  function canAny(permissions: string[]): boolean {
    return permissions.some((p) => can(p));
  }

  function canAll(permissions: string[]): boolean {
    return permissions.every((p) => can(p));
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
    can,
    canAny,
    canAll,
  };
}
