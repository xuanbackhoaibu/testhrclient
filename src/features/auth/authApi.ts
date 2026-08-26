import { httpClient } from '../../shared/api/httpClient';
import { getMockUserByToken } from '../../shared/mocks/mockAuth';
import { mockDelay } from '../../shared/mocks/mockHelpers';
import { normalizeCurrentUser } from './currentUser';
import type { AuthUser } from './types';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

let currentUserPromise: Promise<AuthUser> | null = null;

export function getCurrentUser(): Promise<AuthUser> {
  if (!currentUserPromise) {
    currentUserPromise = fetchCurrentUser().finally(() => {
      currentUserPromise = null;
    });
  }

  return currentUserPromise;
}

async function fetchCurrentUser(): Promise<AuthUser> {
  if (isMockMode) {
    await mockDelay();
    const token = window.localStorage.getItem('hr-web-client.accessToken');
    const user = getMockUserByToken(token);
    if (!user) {
      throw Object.assign(new Error('Unauthenticated'), { response: { status: 401 } });
    }

    return normalizeCurrentUser({
      ...user,
      identity: {
        authUserId: user.authUserId ?? user.externalAuthUserId,
        accountStatus: user.accountStatus,
        roles: user.roles,
        permissions: user.permissions,
        scopes: user.scopes,
        dataScopes: user.dataScopes,
        permissionVersion: user.permissionVersion ?? 1,
        tokenVersion: user.tokenVersion ?? 1,
      },
    });
  }

  const response = await httpClient.get('/auth/me');
  return normalizeCurrentUser(response);
}
