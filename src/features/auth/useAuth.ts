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

  async function refreshCurrentUser(): Promise<void> {
    try {
      const user = await getCurrentUser();
      setSessionUser(user);
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
    return hasNormalizedRole(store.user ?? getStoredUser(), role as never);
  }

  return {
    user: store.user ?? getStoredUser(),
    roles: store.user?.roles ?? getStoredUser()?.roles ?? [],
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login,
    logout,
    refreshCurrentUser,
    hasRole,
  };
}
