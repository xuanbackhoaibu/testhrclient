import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

import { antdTheme, mantineTheme } from './theme';
import { queryClient } from './queryClient';
import { getCurrentUser } from '../features/auth/authApi';
import { clearSession, getAccessToken, setSessionUser } from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { readHttpStatus } from '../shared/api/response';
import { filterSelectOptions } from '../shared/utils/filterSelectOptions';
import { isDefinitiveAuthRefreshFailure } from '../shared/api/authRefreshFailure';

dayjs.locale('vi');

const authorityRecoveryIntervalMs = 10_000;

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
        if (status === 401 && isDefinitiveAuthRefreshFailure(error)) {
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
        if (
          readHttpStatus(error) === 401 &&
          isDefinitiveAuthRefreshFailure(error)
        ) {
          clearSession();
          return;
        }
        setSessionUser(null);
        useAuthStore.getState().setError(
          'Không thể xác minh quyền hiện tại. Dữ liệu quyền cũ đã bị loại bỏ.',
        );
      }
    }

    function recoverMissingAuthority() {
      const { isAuthenticated, user } = useAuthStore.getState();
      if (
        !isAuthenticated ||
        user ||
        document.visibilityState !== 'visible' ||
        !navigator.onLine
      ) {
        return;
      }

      void refreshAuthorityOnForeground();
    }

    document.addEventListener('visibilitychange', refreshAuthorityOnForeground);
    window.addEventListener('online', recoverMissingAuthority);
    const recoveryInterval = window.setInterval(
      recoverMissingAuthority,
      authorityRecoveryIntervalMs,
    );
    return () => {
      document.removeEventListener('visibilitychange', refreshAuthorityOnForeground);
      window.removeEventListener('online', recoverMissingAuthority);
      window.clearInterval(recoveryInterval);
    };
  }, []);

  if (!ready) {
    return (
      <Center mih="100dvh">
        <Stack align="center" gap="sm" role="status" aria-live="polite">
          <Image src="/logo.png" alt="" h={56} w="auto" fit="contain" />
          <Loader color="red" size="sm" />
          <Text c="dimmed" size="sm">
            Đang xác minh phiên đăng nhập...
          </Text>
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider theme={antdTheme}>
      <MantineProvider theme={mantineTheme} defaultColorScheme="light">
        <DatesProvider settings={{ locale: 'vi', firstDayOfWeek: 1, weekendDays: [0] }}>
          <Notifications position="top-right" zIndex={4000} />
          <QueryClientProvider client={queryClient}>
            <AuthBootstrap>{children}</AuthBootstrap>
          </QueryClientProvider>
        </DatesProvider>
      </MantineProvider>
    </ConfigProvider>
  );
}
