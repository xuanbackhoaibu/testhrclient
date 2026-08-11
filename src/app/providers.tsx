import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ConfigProvider } from 'antd';

import { antdTheme, mantineTheme } from './theme';
import { queryClient } from './queryClient';
import { getCurrentUser } from '../features/auth/authApi';
import { clearSession, getAccessToken, setSessionUser } from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';
import { QueryClientProvider } from '@tanstack/react-query';

function readHttpStatus(error: unknown): number | undefined {
  return (
    (error as { statusCode?: number })?.statusCode ??
    (error as { response?: { status?: number } })?.response?.status
  );
}

function AuthBootstrap({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const lastAuthorityRefreshAt = useRef(0);

  useEffect(() => {
    async function bootstrap() {
      const token = getAccessToken();
      if (!token) {
        useAuthStore.getState().setLoading(false);
        setReady(true);
        return;
      }

      useAuthStore.getState().setSession({
        accessToken: token,
        user: null,
      });

      try {
        const user = await getCurrentUser();
        setSessionUser(user);
        lastAuthorityRefreshAt.current = Date.now();
        useAuthStore.getState().setError(null);
      } catch (error: unknown) {
        const status = readHttpStatus(error);
        if (status === 401) {
          clearSession();
        } else if (status === 403) {
          useAuthStore.getState().setError('Tài khoản đã xác thực nhưng không được phép truy cập HRM.');
        } else {
          useAuthStore.getState().setError('Không thể xác minh quyền hiện tại. Vui lòng thử lại.');
        }
      }

      useAuthStore.getState().setLoading(false);
      setReady(true);
    }

    void bootstrap();

    async function refreshAuthorityOnForeground() {
      if (
        document.visibilityState !== 'visible' ||
        !getAccessToken() ||
        Date.now() - lastAuthorityRefreshAt.current < 60_000
      ) {
        return;
      }

      try {
        const user = await getCurrentUser();
        setSessionUser(user);
        lastAuthorityRefreshAt.current = Date.now();
        useAuthStore.getState().setError(null);
      } catch (error: unknown) {
        if (readHttpStatus(error) === 401) {
          clearSession();
          return;
        }
        setSessionUser(null);
        useAuthStore.getState().setError(
          'Không thể xác minh quyền hiện tại. Dữ liệu quyền cũ đã bị loại bỏ.',
        );
      }
    }

    document.addEventListener('visibilitychange', refreshAuthorityOnForeground);
    return () => {
      document.removeEventListener('visibilitychange', refreshAuthorityOnForeground);
    };
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider theme={antdTheme}>
      <MantineProvider theme={mantineTheme}>
        <Notifications position="top-right" zIndex={4000} />
        <QueryClientProvider client={queryClient}>
          <AuthBootstrap>{children}</AuthBootstrap>
        </QueryClientProvider>
      </MantineProvider>
    </ConfigProvider>
  );
}
