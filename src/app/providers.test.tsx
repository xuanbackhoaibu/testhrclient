// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../features/auth/types';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('../features/auth/authApi', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

import { AppProviders } from './providers';
import { useAuthStore } from '../features/auth/authStore';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: '',
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
});

const user = {
  id: 'hr-user-1',
  userId: 'hr-user-1',
  authUserId: 'auth-user-1',
  externalAuthUserId: 'auth-user-1',
  email: 'hr@example.com',
  fullName: 'HR User',
  accountStatus: 'ACTIVE',
  authoritySource: 'chat-auth-runtime',
  employeeId: null,
  employee: null,
  roles: ['HR'],
  permissions: [],
  scopes: [],
  dataScopes: [],
  identityWarnings: [],
} as AuthUser;

describe('AuthBootstrap authority recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.getCurrentUser.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('hr-web-client.accessToken', 'access-token');
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('recovers automatically after a temporary authority outage', async () => {
    mocks.getCurrentUser
      .mockRejectedValueOnce(Object.assign(new Error('temporary outage'), { statusCode: 503 }))
      .mockResolvedValueOnce(user);

    render(
      <AppProviders>
        <div>Ứng dụng sẵn sàng</div>
      </AppProviders>,
    );

    await act(async () => undefined);

    expect(screen.getByText('Ứng dụng sẵn sàng')).toBeTruthy();
    expect(useAuthStore.getState().user).toBeNull();
    expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(mocks.getCurrentUser).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().error).toBeNull();
  });
});
