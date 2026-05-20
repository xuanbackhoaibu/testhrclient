import axios from 'axios';

import { queryClient } from '../../app/queryClient';
import { MOCK_AUTH_USERS, MOCK_TOKENS, getMockUserByToken } from '../../shared/mocks/mockAuth';
import {
  STORAGE_KEYS,
  getSessionString,
  getStoredString,
  removeSessionString,
  removeStoredString,
  setSessionString,
  setStoredString,
} from '../../shared/utils/storage';
import { useAuthStore } from './authStore';
import { CURRENT_USER_QUERY_KEY, normalizeCurrentUser } from './currentUser';
import type { AuthUser, DemoRole, LoginCredentials } from './types';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

interface AuthServiceLoginPayload {
  loginIdentifier: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthServiceLoginResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    mustChangePassword?: boolean;
    nextAction?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  mustChangePassword?: boolean;
  nextAction?: string;
}

export interface AuthLoginOutcome {
  mustChangePassword: boolean;
  nextAction?: string;
}

export function getAccessToken(): string | null {
  const token = getStoredString(STORAGE_KEYS.accessToken)?.trim();
  if (!token || token === 'undefined' || token === 'null') {
    return null;
  }

  return token;
}

export function getRefreshToken(): string | null {
  const token =
    getStoredString(STORAGE_KEYS.refreshToken) ??
    getSessionString(STORAGE_KEYS.refreshToken);
  if (!token || token === 'undefined' || token === 'null') {
    return null;
  }
  return token;
}

export function setRefreshToken(token: string, persistent: boolean): void {
  if (persistent) {
    setStoredString(STORAGE_KEYS.refreshToken, token);
    removeSessionString(STORAGE_KEYS.refreshToken);
  } else {
    setSessionString(STORAGE_KEYS.refreshToken, token);
    removeStoredString(STORAGE_KEYS.refreshToken);
  }
}

export function isRememberMe(): boolean {
  return getStoredString(STORAGE_KEYS.rememberMe) === 'true';
}

export function setAccessToken(token: string): void {
  if (!token.trim() || token === 'undefined' || token === 'null') {
    throw new Error('Invalid access token.');
  }

  setStoredString(STORAGE_KEYS.accessToken, token);
  useAuthStore.getState().setSession({
    accessToken: token,
    user: useAuthStore.getState().user,
  });
}

export function setSessionUser(user: AuthUser | null): void {
  const normalizedUser = user ? normalizeCurrentUser(user) : null;

  if (user) {
    setStoredString(STORAGE_KEYS.currentUser, JSON.stringify(normalizedUser));
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, normalizedUser);
  } else {
    removeStoredString(STORAGE_KEYS.currentUser);
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  }

  useAuthStore.getState().setSession({
    accessToken: getAccessToken(),
    user: normalizedUser,
  });
}

export function getStoredUser(): AuthUser | null {
  const raw = getStoredString(STORAGE_KEYS.currentUser);
  if (!raw) {
    return null;
  }

  try {
    return normalizeCurrentUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readAuthLoginError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: unknown; error?: unknown; code?: unknown } | undefined;
    if (typeof payload?.message === 'string') {
      return payload.message;
    }
    if (typeof payload?.error === 'string') {
      return payload.error;
    }
    if (typeof payload?.code === 'string') {
      return `Login failed: ${payload.code}`;
    }
  }

  return error instanceof Error ? error.message : 'Login failed.';
}

function readAuthEnv(primary: string, fallback: string): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  return env[primary] || env[fallback];
}

export async function login(
  input: DemoRole | LoginCredentials = 'HR',
): Promise<AuthLoginOutcome> {
  if (isMockMode) {
    const role = typeof input === 'string' ? input : 'HR';
    const token = MOCK_TOKENS[role];
    const user = normalizeCurrentUser(MOCK_AUTH_USERS[role]);
    setStoredString(STORAGE_KEYS.accessToken, token);
    queryClient.clear();
    setSessionUser(user);
    return {
      mustChangePassword: Boolean(user.mustChangePassword),
      nextAction: user.mustChangePassword ? 'CHANGE_PASSWORD_REQUIRED' : 'NONE',
    };
  }

  const loginUrl = readAuthEnv(
    'VITE_AUTH_SERVICE_LOGIN_URL',
    'VITE_CHAT_AUTH_LOGIN_URL',
  );

  if (!loginUrl) {
    throw new Error('VITE_AUTH_SERVICE_LOGIN_URL is required.');
  }

  if (typeof input === 'string') {
    throw new Error('Real auth requires loginIdentifier and password.');
  }

  const payload: AuthServiceLoginPayload = {
    loginIdentifier: input.loginIdentifier.trim(),
    password: input.password,
    rememberMe: input.rememberMe,
  };

  try {
    const response = await axios.post<AuthServiceLoginResponse>(loginUrl, payload, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const responseData = response.data.data ?? response.data;
    const accessToken = responseData?.accessToken;
    if (!accessToken) {
      throw new Error('Auth service login response did not include accessToken.');
    }

    const mustChangePassword = Boolean(responseData?.mustChangePassword);
    const nextAction = responseData?.nextAction;
    const persistent = payload.rememberMe === true;

    setAccessToken(accessToken);

    const refreshToken = responseData?.refreshToken;
    if (refreshToken) {
      setRefreshToken(refreshToken, persistent);
    }
    setStoredString(STORAGE_KEYS.rememberMe, String(persistent));

    queryClient.clear();
    setSessionUser(null);
    return { mustChangePassword, nextAction };
  } catch (error) {
    throw new Error(readAuthLoginError(error), { cause: error });
  }
}

export function handleCallback(): string {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = query.get('access_token') ?? query.get('token') ?? hash.get('access_token') ?? hash.get('token');

  if (!token) {
    throw new Error('Không tìm thấy access token từ dịch vụ xác thực.');
  }

  setStoredString(STORAGE_KEYS.accessToken, token);
  queryClient.clear();
  setSessionUser(null);

  const mockUser = getMockUserByToken(token);
  if (mockUser) {
    setSessionUser(normalizeCurrentUser(mockUser));
  }

  return token;
}

export function clearSession(): void {
  removeStoredString(STORAGE_KEYS.accessToken);
  removeStoredString(STORAGE_KEYS.currentUser);
  removeStoredString(STORAGE_KEYS.refreshToken);
  removeStoredString(STORAGE_KEYS.rememberMe);
  removeSessionString(STORAGE_KEYS.refreshToken);
  queryClient.clear();
  useAuthStore.getState().clearSession();
}

export async function logout(): Promise<void> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!isMockMode) {
    const logoutUrl = readAuthEnv(
      'VITE_AUTH_SERVICE_LOGOUT_URL',
      'VITE_CHAT_AUTH_LOGOUT_URL',
    );
    if (logoutUrl && accessToken) {
      await axios
        .post(
          logoutUrl,
          refreshToken ? { refreshToken } : {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )
        .catch(() => undefined);
    }
  }

  clearSession();

  window.location.assign('/login');
}
