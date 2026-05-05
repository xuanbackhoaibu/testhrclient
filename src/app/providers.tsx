import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import { queryClient } from './queryClient';
import { getCurrentUser } from '../features/auth/authApi';
import { clearSession, getAccessToken, getStoredUser, setSessionUser } from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';
import { QueryClientProvider } from '@tanstack/react-query';

function readHttpStatus(error: unknown): number | undefined {
  return (
    (error as { statusCode?: number })?.statusCode ??
    (error as { response?: { status?: number } })?.response?.status
  );
}

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '650',
  },
  components: {
    Paper: {
      defaultProps: {
        withBorder: true,
        shadow: 'none',
      },
    },
    Table: {
      defaultProps: {
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
    },
  },
});

function AuthBootstrap({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      const token = getAccessToken();
      if (!token) {
        useAuthStore.getState().setLoading(false);
        setReady(true);
        return;
      }

      const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
      const storedUser = getStoredUser();
      useAuthStore.getState().setSession({
        accessToken: token,
        user: isMockMode ? storedUser : null,
      });

      if (isMockMode && storedUser) {
        setSessionUser(storedUser);
        useAuthStore.getState().setLoading(false);
        setReady(true);
        return;
      }

      try {
        const user = await getCurrentUser();
        setSessionUser(user);
        useAuthStore.getState().setError(null);
      } catch (error: unknown) {
        const status = readHttpStatus(error);
        if (status === 401 || status === 403) {
          clearSession();
          if (status === 403) {
            useAuthStore.getState().setError('Tài khoản đã xác thực nhưng chưa được cấp quyền HRM.');
          }
        } else {
          useAuthStore.getState().setError('Không tải được thông tin người dùng HRM.');
        }
      }

      useAuthStore.getState().setLoading(false);
      setReady(true);
    }

    void bootstrap();
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" zIndex={4000} />
        <QueryClientProvider client={queryClient}>
          <AuthBootstrap>{children}</AuthBootstrap>
        </QueryClientProvider>
    </MantineProvider>
  );
}
