import { api } from '../../shared/api/httpClient';
import { getMockUserByToken } from '../../shared/mocks/mockAuth';
import { mockDelay } from '../../shared/mocks/mockHelpers';
import type { AuthUser } from './types';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    scopes: Array.isArray(user.scopes) ? user.scopes : [],
    dataScopes: Array.isArray(user.dataScopes)
      ? user.dataScopes
      : Array.isArray(user.scopes)
        ? user.scopes.map((scope) => ({
            scopeType: scope.scopeType,
            unitId: scope.unitIds?.[0] ?? scope.unitId ?? null,
            departmentId: scope.departmentIds?.[0] ?? scope.departmentId ?? null,
          }))
        : [],
  };
}

export async function getCurrentUser(): Promise<AuthUser> {
  if (isMockMode) {
    await mockDelay();
    const token = window.localStorage.getItem('hr-web-client.accessToken');
    const user = getMockUserByToken(token);
    if (!user) {
      throw Object.assign(new Error('Unauthenticated'), { response: { status: 401 } });
    }

    return normalizeAuthUser(user);
  }

  const user = await api.get<AuthUser>('/auth/me');
  return normalizeAuthUser(user);
}
