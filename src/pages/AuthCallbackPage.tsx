import { useEffect } from 'react';
import { Alert, Card, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

import { handleCallback } from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';
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
        navigate(ROUTES.dashboard, { replace: true });
      } catch (callbackError) {
        useAuthStore.getState().setError(
          callbackError instanceof Error ? callbackError.message : 'Không xử lý được callback từ chat-auth-service.',
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
    <Card>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Auth callback failed
        </Typography.Title>
        <Alert type="error" showIcon message={error} />
      </Space>
    </Card>
  );
}

