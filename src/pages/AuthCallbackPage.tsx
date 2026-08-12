import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, Group, Loader, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconId, IconLogin, IconUserSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

import { handleCallback } from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';
import { getPostLoginDestination } from '../features/auth/postLoginDestination';
import { useAuth } from '../features/auth/useAuth';
import { ROUTES } from '../shared/constants/routes';

type CallbackStep = 'auth' | 'profile' | 'done';

const callbackSteps: Array<{ key: CallbackStep; label: string; description: string; icon: typeof IconId }> = [
  { key: 'auth', label: 'Xác thực', description: 'Đọc token từ Auth Service.', icon: IconId },
  { key: 'profile', label: 'Tải hồ sơ', description: 'Gọi /auth/me để lấy HRM profile.', icon: IconUserSearch },
  { key: 'done', label: 'Hoàn tất', description: 'Điều hướng tới màn hình phù hợp.', icon: IconCheck },
];

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAuth();
  const storeError = useAuthStore((state) => state.error);
  const [activeStep, setActiveStep] = useState<CallbackStep>('auth');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      try {
        setActiveStep('auth');
        handleCallback();

        setActiveStep('profile');
        await refreshCurrentUser();

        setActiveStep('done');
        const user = useAuthStore.getState().user;
        window.setTimeout(() => {
          navigate(getPostLoginDestination(user) ?? ROUTES.root, { replace: true });
        }, 350);
      } catch (callbackError) {
        const message = callbackError instanceof Error ? callbackError.message : 'Không xử lý được callback từ dịch vụ xác thực.';
        setLocalError(message);
        useAuthStore.getState().setError(message);
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    }

    void processCallback();
  }, [navigate, refreshCurrentUser]);

  const error = localError ?? storeError;
  const activeIndex = callbackSteps.findIndex((step) => step.key === activeStep);

  return (
    <Card withBorder className="auth-callback-card">
      <Stack gap="lg">
        <Stack gap={4} align="center">
          <Title order={4}>Đang hoàn tất đăng nhập</Title>
          <Text size="sm" c="dimmed" ta="center">
            Hệ thống đang xác thực phiên và tải hồ sơ HRM của bạn.
          </Text>
        </Stack>

        <Stack gap="sm">
          {callbackSteps.map((step, index) => {
            const Icon = step.icon;
            const done = index < activeIndex || activeStep === 'done';
            const current = index === activeIndex && !error && activeStep !== 'done';
            return (
              <Group key={step.key} className={`auth-callback-step ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`} wrap="nowrap">
                <ThemeIcon color={done ? 'green' : current ? 'blue' : 'gray'} variant={done || current ? 'light' : 'default'} radius="xl" size={38}>
                  {current ? <Loader size={16} /> : done ? <IconCheck size={18} /> : <Icon size={18} />}
                </ThemeIcon>
                <Box>
                  <Text fw={800}>{step.label}</Text>
                  <Text size="xs" c="dimmed">{step.description}</Text>
                </Box>
              </Group>
            );
          })}
        </Stack>

        {error ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />} title="Không thể hoàn tất đăng nhập">
            <Stack gap="sm">
              <Text size="sm">{error}</Text>
              <Group>
                <Button leftSection={<IconLogin size={16} />} onClick={() => window.location.assign(ROUTES.login)}>
                  Quay lại đăng nhập
                </Button>
              </Group>
            </Stack>
          </Alert>
        ) : null}
      </Stack>
    </Card>
  );
}
