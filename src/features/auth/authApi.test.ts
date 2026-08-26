// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../../shared/api/httpClient', () => ({
  httpClient: { get: mocks.get },
}));

describe('getCurrentUser single-flight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCKS', 'false');
  });

  it('shares one canonical authority request across concurrent callers', async () => {
    let resolveRequest!: (value: unknown) => void;
    mocks.get.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { getCurrentUser } = await import('./authApi');
    const first = getCurrentUser();
    const second = getCurrentUser();

    expect(second).toBe(first);
    expect(mocks.get).toHaveBeenCalledTimes(1);

    resolveRequest({
      data: {
        id: 'hr-user-1',
        identity: {
          authUserId: 'auth-user-1',
          accountStatus: 'ACTIVE',
          roles: ['HR'],
          permissions: [],
        },
      },
    });

    await expect(first).resolves.toMatchObject({
      authUserId: 'auth-user-1',
      accountStatus: 'ACTIVE',
    });
  });
});
