// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    get: mocks.get,
    post: mocks.post,
    isAxiosError: (error: unknown) =>
      Boolean((error as { isAxiosError?: boolean } | null)?.isAxiosError),
  },
}));

describe('refreshSessionAuthority single-flight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubEnv('VITE_AUTH_SERVICE_BASE_URL', 'https://auth.test/api/v1/auth');
    vi.stubEnv('VITE_HR_API_BASE_URL', 'https://hr.test/api');
  });

  it('rotates one refresh token only once for concurrent callers', async () => {
    localStorage.setItem('hr-web-client.refreshToken', 'refresh-token');
    localStorage.setItem('hr-web-client.rememberMe', 'true');

    let resolveRefresh!: (value: {
      data: { data: { accessToken: string; refreshToken: string } };
    }) => void;
    mocks.post.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    mocks.get.mockResolvedValue({
      data: {
        data: {
          id: 'hr-user-1',
          identity: {
            authUserId: 'auth-user-1',
            accountStatus: 'ACTIVE',
            roles: ['HR'],
            permissions: [],
          },
        },
      },
    });

    const { refreshSessionAuthority } = await import('./authClient');
    const first = refreshSessionAuthority();
    const second = refreshSessionAuthority();

    expect(mocks.post).toHaveBeenCalledTimes(1);

    resolveRefresh({
      data: {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      },
    });

    await Promise.all([first, second]);

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('hr-web-client.accessToken')).toBe(
      'new-access-token',
    );
  });
});
