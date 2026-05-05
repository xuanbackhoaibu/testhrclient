import { message } from 'antd';

import { getCurrentUser } from './authApi';
import { clearSession, getStoredUser, login as loginClient, logout as logoutClient, setSessionUser } from './authClient';
import { useAuthStore } from './authStore';
import type { DemoRole } from './types';

export function useAuth() {
  const store = useAuthStore();

  async function refreshCurrentUser(): Promise<void> {
    try {
      const user = await getCurrentUser();
      setSessionUser(user);
      useAuthStore.getState().setError(null);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
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

  async function login(role?: DemoRole): Promise<void> {
    await loginClient(role);
  }

  function logout(): void {
    logoutClient();
  }

  function hasRole(role: string): boolean {
    return Boolean(store.user?.roles.includes(role));
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

