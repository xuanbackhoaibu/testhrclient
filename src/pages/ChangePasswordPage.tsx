import { useState } from 'react';
import { Alert, Button, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconLock } from '@tabler/icons-react';
import axios from 'axios';

import { getAccessToken, clearSession } from '../features/auth/authClient';
import { ROUTES } from '../shared/constants/routes';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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

export function ChangePasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ChangePasswordForm>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      currentPassword: (v) => (v ? null : 'Nhập mật khẩu hiện tại.'),
      newPassword: (v) =>
        !v
          ? 'Nhập mật khẩu mới.'
          : v.length < 8
            ? 'Mật khẩu mới phải từ 8 ký tự.'
            : null,
      confirmPassword: (v, values) =>
        v !== values.newPassword ? 'Xác nhận mật khẩu không khớp.' : null,
    },
  });

  async function handleSubmit(values: ChangePasswordForm) {
    setSubmitting(true);
    setError(null);
    try {
      const url = buildChangePasswordUrl();
      if (!url) {
        throw new Error('VITE_AUTH_SERVICE_BASE_URL is required.');
      }

      const token = getAccessToken();
      await axios.post(
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
          withCredentials: true,
        },
      );

      notifications.show({
        color: 'green',
        title: 'Đổi mật khẩu thành công',
        message: 'Vui lòng đăng nhập lại.',
      });

      clearSession();
      window.location.assign(ROUTES.login);
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
          Tài khoản của bạn yêu cầu đổi mật khẩu trước khi tiếp tục.
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
            placeholder="Ít nhất 8 ký tự"
            leftSection={<IconLock size={18} />}
            autoComplete="new-password"
            disabled={submitting}
            {...form.getInputProps('newPassword')}
          />
          <PasswordInput
            label="Xác nhận mật khẩu mới"
            placeholder="Nhập lại mật khẩu mới"
            leftSection={<IconLock size={18} />}
            autoComplete="new-password"
            disabled={submitting}
            {...form.getInputProps('confirmPassword')}
          />
          <Button type="submit" size="md" loading={submitting}>
            Đổi mật khẩu
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
