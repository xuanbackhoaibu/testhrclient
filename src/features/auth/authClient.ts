import axios from 'axios';

import { MOCK_AUTH_USERS, MOCK_TOKENS, getMockUserByToken } from '../../shared/mocks/mockAuth';
import { STORAGE_KEYS, getStoredString, removeStoredString, setStoredString } from '../../shared/utils/storage';
import { useAuthStore } from './authStore';
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
  };
  accessToken?: string;
}

export function getAccessToken(): string | null {
  const token = getStoredString(STORAGE_KEYS.accessToken)?.trim();
  if (!token || token === 'undefined' || token === 'null') {
    return null;
  }

  return token;
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
  if (user) {
    setStoredString(STORAGE_KEYS.currentUser, JSON.stringify(user));
  } else {
    removeStoredString(STORAGE_KEYS.currentUser);
  }

  useAuthStore.getState().setSession({
    accessToken: getAccessToken(),
    user,
  });
}

export function getStoredUser(): AuthUser | null {
  const raw = getStoredString(STORAGE_KEYS.currentUser);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
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

export async function login(input: DemoRole | LoginCredentials = 'HR'): Promise<void> {
  if (isMockMode) {
    const role = typeof input === 'string' ? input : 'HR';
    const token = MOCK_TOKENS[role];
    const user = MOCK_AUTH_USERS[role];
    setStoredString(STORAGE_KEYS.accessToken, token);
    setStoredString(STORAGE_KEYS.currentUser, JSON.stringify(user));
    useAuthStore.getState().setSession({ accessToken: token, user });
    return;
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
      withCredentials: true,
    });

    const accessToken = response.data.data?.accessToken ?? response.data.accessToken;
    if (!accessToken) {
      throw new Error('Auth service login response did not include accessToken.');
    }

    setAccessToken(accessToken);
    setSessionUser(null);
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

  const mockUser = getMockUserByToken(token);
  if (mockUser) {
    setStoredString(STORAGE_KEYS.currentUser, JSON.stringify(mockUser));
  }

  return token;
}

export function clearSession(): void {
  removeStoredString(STORAGE_KEYS.accessToken);
  removeStoredString(STORAGE_KEYS.currentUser);
  useAuthStore.getState().clearSession();
}

export async function logout(): Promise<void> {
  const accessToken = getAccessToken();

  if (!isMockMode) {
    const logoutUrl = readAuthEnv(
      'VITE_AUTH_SERVICE_LOGOUT_URL',
      'VITE_CHAT_AUTH_LOGOUT_URL',
    );
    if (logoutUrl && accessToken) {
      await axios
        .post(
          logoutUrl,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            withCredentials: true,
          },
        )
        .catch(() => undefined);
    }
  }

  clearSession();

  window.location.assign('/login');
}
