import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { getCurrentUser } from '../features/auth/authApi';
import { clearSession, getAccessToken, getStoredUser, setSessionUser } from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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

      const storedUser = getStoredUser();
      useAuthStore.getState().setSession({ accessToken: token, user: storedUser });

      const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';
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
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          clearSession();
          if (status === 403) {
            useAuthStore.getState().setError('Tai khoan da xac thuc nhung chua duoc cap quyen HRM.');
          }
        } else {
          useAuthStore.getState().setError('Khong tai duoc thong tin nguoi dung HRM.');
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
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 8,
          colorPrimary: '#1677ff',
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <AuthBootstrap>{children}</AuthBootstrap>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}
