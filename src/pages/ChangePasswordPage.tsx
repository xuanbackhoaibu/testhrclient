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

import {
  clearSession,
  getAccessToken,
} from '../features/auth/authClient';
import {
  getPasswordPolicyChecks,
  PASSWORD_LENGTH,
  validatePasswordPolicy,
} from '../features/auth/passwordPolicy';
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

function validateNewPassword(value: string): string | null {
  return validatePasswordPolicy(value);
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
      currentPassword: (value) => (value ? null : 'Nhập mật khẩu hiện tại.'),
      newPassword: validateNewPassword,
      confirmPassword: (value, values) =>
        value !== values.newPassword ? 'Xác nhận mật khẩu không khớp.' : null,
    },
  });

  const policyChecks = getPasswordPolicyChecks(form.values.newPassword);
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
          confirmPassword: values.confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data?.data;
      if (data?.mustChangePassword || data?.nextAction === 'CHANGE_PASSWORD_REQUIRED') {
        throw new Error('Tài khoản vẫn bị yêu cầu đổi mật khẩu sau khi cập nhật.');
      }

      notifications.show({
        color: 'green',
        title: 'Đổi mật khẩu thành công',
        message: 'Vui lòng đăng nhập lại bằng mật khẩu mới.',
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
          Bạn đang sử dụng mật khẩu tạm thời. Vui lòng đổi mật khẩu để tiếp tục.
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
            placeholder={`Đúng ${PASSWORD_LENGTH} ký tự`}
            leftSection={<IconLock size={18} />}
            autoComplete="new-password"
            disabled={submitting}
            {...form.getInputProps('newPassword')}
          />

          {showPolicy ? (
            <List spacing={4} size="sm">
              {policyChecks.map((check) => (
                <List.Item
                  key={check.label}
                  icon={
                    <ThemeIcon
                      color={check.pass ? 'green' : 'red'}
                      size={16}
                      radius="xl"
                    >
                      {check.pass ? <IconCheck size={10} /> : <IconX size={10} />}
                    </ThemeIcon>
                  }
                  c={check.pass ? 'green' : 'red'}
                >
                  {check.label}
                </List.Item>
              ))}
            </List>
          ) : null}

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
            disabled={submitting || (showPolicy && policyChecks.some((check) => !check.pass))}
          >
            Đổi mật khẩu
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
