import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

import { queryClient } from './queryClient';
import { getCurrentUser } from '../features/auth/authApi';
import { clearSession, getAccessToken, setSessionUser } from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { readHttpStatus } from '../shared/api/response';

dayjs.locale('vi');


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
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ locale: 'vi', firstDayOfWeek: 1, weekendDays: [0] }}>
        <Notifications position="top-right" zIndex={4000} />
        <QueryClientProvider client={queryClient}>
          <AuthBootstrap>{children}</AuthBootstrap>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
