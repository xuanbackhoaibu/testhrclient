export const STORAGE_KEYS = {
  accessToken: 'hr-web-client.accessToken',
  currentUser: 'hr-web-client.currentUser',
  refreshToken: 'hr-web-client.refreshToken',
  rememberMe: 'hr-web-client.rememberMe',
} as const;

export function getStoredString(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
}

export function setStoredString(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value);
}

export function removeStoredString(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(key);
}

export function getSessionString(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage.getItem(key);
}

export function setSessionString(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(key, value);
}

export function removeSessionString(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(key);
}

