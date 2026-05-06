import { useState } from 'react';
import {
  Alert,
  Button,
  List,
  PasswordInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconCheck, IconLock, IconX } from '@tabler/icons-react';
import axios from 'axios';

import { getAccessToken, setAccessToken } from '../features/auth/authClient';
import { useAuthStore } from '../features/auth/authStore';
import { ROUTES } from '../shared/constants/routes';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    mustChangePassword?: boolean;
    nextAction?: string;
  };
}

function readAuthEnv(primary: string, fallback: string): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  return env[primary] || env[fallback];
}

function buildChangePasswordUrl(): string {
  const base =
    readAuthEnv('VITE_AUTH_SERVICE_BASE_URL', 'VITE_CHAT_AUTH_BASE_URL') ?? '';
  return `${base.replace(/\/+$/, '')}/change-password`;
}

interface PolicyCheck {
  label: string;
  pass: boolean;
}

function checkPolicy(password: string): PolicyCheck[] {
  return [
    { label: 'Ít nhất 12 ký tự', pass: password.length >= 12 },
    { label: 'Có chữ thường (a-z)', pass: /[a-z]/.test(password) },
    { label: 'Có chữ hoa (A-Z)', pass: /[A-Z]/.test(password) },
    { label: 'Có chữ số (0-9)', pass: /\d/.test(password) },
    { label: 'Có ký tự đặc biệt (!@#$%...)', pass: /[^a-zA-Z0-9]/.test(password) },
  ];
}

function validateNewPassword(v: string): string | null {
  if (!v) return 'Nhập mật khẩu mới.';
  const checks = checkPolicy(v);
  if (checks.some((c) => !c.pass)) return 'Mật khẩu chưa đạt yêu cầu.';
  return null;
}

export function ChangePasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);

  const form = useForm<ChangePasswordForm>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      currentPassword: (v) => (v ? null : 'Nhập mật khẩu hiện tại.'),
      newPassword: validateNewPassword,
      confirmPassword: (v, values) =>
        v !== values.newPassword ? 'Xác nhận mật khẩu không khớp.' : null,
    },
  });

  const policyChecks = checkPolicy(form.values.newPassword);
  const showPolicy = form.values.newPassword.length > 0;

  async function handleSubmit(values: ChangePasswordForm) {
    setSubmitting(true);
    setError(null);
    try {
      const url = buildChangePasswordUrl();
      if (!url) {
        throw new Error('VITE_AUTH_SERVICE_BASE_URL is required.');
      }

      const token = getAccessToken();
      const response = await axios.post<ChangePasswordResponse>(
        url,
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data?.data;

      notifications.show({
        color: 'green',
        title: 'Đổi mật khẩu thành công',
        message: 'Bạn có thể tiếp tục sử dụng hệ thống.',
      });

      if (data?.accessToken) {
        // Server issued new tokens — update session in-place, no re-login needed
        setAccessToken(data.accessToken);
        setSession({ accessToken: data.accessToken, user: null });
        // Redirect to dashboard; providers.tsx will fetch /me to hydrate user
        window.location.assign(ROUTES.dashboard);
      } else {
        // Fallback: force re-login
        window.location.assign(ROUTES.login);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string } | undefined;
        setError(payload?.message ?? 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
      } else {
        setError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={4}>Đổi mật khẩu bắt buộc</Title>
        <Text c="dimmed" size="sm">
          Bạn đang sử dụng mật khẩu ban đầu. Vui lòng đổi mật khẩu để tiếp tục.
        </Text>
      </Stack>

      {error ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {error}
        </Alert>
      ) : null}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <PasswordInput
            label="Mật khẩu hiện tại"
            placeholder="Mật khẩu hiện tại"
            leftSection={<IconLock size={18} />}
            autoComplete="current-password"
            disabled={submitting}
            {...form.getInputProps('currentPassword')}
          />
          <PasswordInput
            label="Mật khẩu mới"
            placeholder="Ít nhất 12 ký tự"
            leftSection={<IconLock size={18} />}
            autoComplete="new-password"
            disabled={submitting}
            {...form.getInputProps('newPassword')}
          />

          {showPolicy && (
            <List spacing={4} size="sm">
              {policyChecks.map((c) => (
                <List.Item
                  key={c.label}
                  icon={
                    <ThemeIcon color={c.pass ? 'green' : 'red'} size={16} radius="xl">
                      {c.pass ? <IconCheck size={10} /> : <IconX size={10} />}
                    </ThemeIcon>
                  }
                  c={c.pass ? 'green' : 'red'}
                >
                  {c.label}
                </List.Item>
              ))}
            </List>
          )}

          <PasswordInput
            label="Xác nhận mật khẩu mới"
            placeholder="Nhập lại mật khẩu mới"
            leftSection={<IconLock size={18} />}
            autoComplete="new-password"
            disabled={submitting}
            {...form.getInputProps('confirmPassword')}
          />
          <Button
            type="submit"
            size="md"
            loading={submitting}
            disabled={submitting || (showPolicy && policyChecks.some((c) => !c.pass))}
          >
            Đổi mật khẩu
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
