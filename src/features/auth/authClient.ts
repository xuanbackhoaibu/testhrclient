import { MOCK_AUTH_USERS, MOCK_TOKENS, getMockUserByToken } from '../../shared/mocks/mockAuth';
import { STORAGE_KEYS, getStoredString, removeStoredString, setStoredString } from '../../shared/utils/storage';
import { useAuthStore } from './authStore';
import type { AuthUser, DemoRole } from './types';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export function getAccessToken(): string | null {
  return getStoredString(STORAGE_KEYS.accessToken);
}

export function setAccessToken(token: string): void {
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

export async function login(role: DemoRole = 'HR_ADMIN'): Promise<void> {
  if (isMockMode) {
    const token = MOCK_TOKENS[role];
    const user = MOCK_AUTH_USERS[role];
    setStoredString(STORAGE_KEYS.accessToken, token);
    setStoredString(STORAGE_KEYS.currentUser, JSON.stringify(user));
    useAuthStore.getState().setSession({ accessToken: token, user });
    return;
  }

  const loginUrl = import.meta.env.VITE_CHAT_AUTH_LOGIN_URL;
  const redirectUri = import.meta.env.VITE_CHAT_AUTH_REDIRECT_URI;
  const clientId = import.meta.env.VITE_CHAT_AUTH_CLIENT_ID;

  try {
    const url = new URL(loginUrl);
    if (redirectUri) {
      url.searchParams.set('redirect_uri', redirectUri);
    }
    if (clientId) {
      url.searchParams.set('client_id', clientId);
    }
    window.location.assign(url.toString());
  } catch {
    window.location.assign(loginUrl);
  }
}

export function handleCallback(): string {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = query.get('access_token') ?? query.get('token') ?? hash.get('access_token') ?? hash.get('token');

  if (!token) {
    throw new Error('Không tìm thấy access token từ chat-auth-service.');
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

export function logout(): void {
  clearSession();

  if (!isMockMode) {
    const logoutUrl = import.meta.env.VITE_CHAT_AUTH_LOGOUT_URL;
    if (logoutUrl) {
      window.location.assign(logoutUrl);
      return;
    }
  }

  window.location.assign('/login');
}

