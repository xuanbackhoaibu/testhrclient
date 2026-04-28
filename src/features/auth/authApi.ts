import { api } from '../../shared/api/httpClient';
import { getMockUserByToken } from '../../shared/mocks/mockAuth';
import { mockDelay } from '../../shared/mocks/mockHelpers';
import type { AuthUser } from './types';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export async function getCurrentUser(): Promise<AuthUser> {
  if (isMockMode) {
    await mockDelay();
    const token = window.localStorage.getItem('hr-web-client.accessToken');
    const user = getMockUserByToken(token);
    if (!user) {
      throw Object.assign(new Error('Unauthenticated'), { response: { status: 401 } });
    }

    return user;
  }

  return api.get<AuthUser>('/auth/me');
}
