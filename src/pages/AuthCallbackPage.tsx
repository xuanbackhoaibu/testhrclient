import { useEffect } from 'react';
import { Alert, Paper, Stack, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { handleCallback } from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';
import { getPostLoginDestination } from '../features/auth/postLoginDestination';
import { useAuth } from '../features/auth/useAuth';
import { ROUTES } from '../shared/constants/routes';
import { LoadingState } from '../shared/components/LoadingState';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAuth();
  const error = useAuthStore((state) => state.error);

  useEffect(() => {
    async function processCallback() {
      try {
        handleCallback();
        await refreshCurrentUser();
        const user = useAuthStore.getState().user;
        navigate(getPostLoginDestination(user) ?? ROUTES.root, {
          replace: true,
        });
      } catch (callbackError) {
        useAuthStore.getState().setError(
          callbackError instanceof Error ? callbackError.message : 'Không xử lý được callback từ dịch vụ xác thực.',
        );
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    }

    void processCallback();
  }, [navigate, refreshCurrentUser]);

  if (!error) {
    return <LoadingState tip="Đang hoàn tất phiên đăng nhập..." />;
  }

  return (
    <Paper p="lg" radius="md">
      <Stack gap="sm">
        <Title order={4}>Không hoàn tất được đăng nhập</Title>
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {error}
        </Alert>
      </Stack>
    </Paper>
  );
}
