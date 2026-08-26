import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Center,
  Image,
  Loader,
  MantineProvider,
  Stack,
  Text,
  createTheme,
} from '@mantine/core';
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
import { filterSelectOptions } from '../shared/utils/filterSelectOptions';
import { isDefinitiveAuthRefreshFailure } from '../shared/api/authRefreshFailure';

dayjs.locale('vi');


const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily:
    '"Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      '"Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '650',
    // Chữ lớn giãn mặc định trông rời rạc; siết nhẹ theo cỡ để tiêu đề đọc thành
    // một khối. Dừng ở -0.02em, đủ chặt mà không dính chữ.
    sizes: {
      h1: { fontSize: '1.75rem', lineHeight: '1.25', fontWeight: '680' },
      h2: { fontSize: '1.375rem', lineHeight: '1.3', fontWeight: '660' },
      h3: { fontSize: '1.125rem', lineHeight: '1.35' },
      h4: { fontSize: '1rem', lineHeight: '1.4' },
    },
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
    Select: {
      defaultProps: {
        filter: filterSelectOptions,
      },
    },
    MultiSelect: {
      defaultProps: {
        filter: filterSelectOptions,
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

    document.addEventListener('visibilitychange', refreshAuthorityOnForeground);
    return () => {
      document.removeEventListener('visibilitychange', refreshAuthorityOnForeground);
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
