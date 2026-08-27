import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Group,
  List,
  PasswordInput,
  Progress,
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
  PASSWORD_MIN_LENGTH,
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

function getPasswordStrengthScore(checks: ReturnType<typeof getPasswordPolicyChecks>) {
  return checks.filter((check) => check.pass).length;
}

function getPasswordStrengthMeta(score: number) {
  if (score <= 1) return { label: 'Yếu', color: 'red', value: 25 };
  if (score === 2) return { label: 'Trung bình', color: 'orange', value: 50 };
  if (score === 3) return { label: 'Khá', color: 'yellow', value: 75 };
  return { label: 'Mạnh', color: 'green', value: 100 };
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
  const strength = getPasswordStrengthMeta(getPasswordStrengthScore(policyChecks));
  const confirmTouched = form.values.confirmPassword.length > 0;
  const confirmMatched = confirmTouched && form.values.confirmPassword === form.values.newPassword;

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
            size="md"
            radius="lg"
            autoComplete="current-password"
            disabled={submitting}
            {...form.getInputProps('currentPassword')}
          />

          <PasswordInput
            label="Mật khẩu mới"
            placeholder={`Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`}
            leftSection={<IconLock size={18} />}
            size="md"
            radius="lg"
            autoComplete="new-password"
            disabled={submitting}
            {...form.getInputProps('newPassword')}
          />

          {showPolicy ? (
            <Card withBorder className="change-password-policy-card">
              <Stack gap="sm">
                <Box>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" fw={800}>Độ mạnh mật khẩu</Text>
                    <Text size="sm" fw={800} c={`${strength.color}.7`}>{strength.label}</Text>
                  </Group>
                  <Progress value={strength.value} color={strength.color} size="md" radius="xl" />
                </Box>
                <List spacing={6} size="sm" className="change-password-checklist">
                  {policyChecks.map((check) => (
                    <List.Item
                      key={check.label}
                      icon={
                        <ThemeIcon
                          color={check.pass ? 'green' : 'gray'}
                          size={18}
                          radius="xl"
                          variant={check.pass ? 'filled' : 'light'}
                        >
                          {check.pass ? <IconCheck size={12} /> : <IconX size={12} />}
                        </ThemeIcon>
                      }
                      c={check.pass ? 'green' : 'dimmed'}
                    >
                      {check.label}
                    </List.Item>
                  ))}
                </List>
              </Stack>
            </Card>
          ) : null}

          <PasswordInput
            label="Xác nhận mật khẩu mới"
            placeholder="Nhập lại mật khẩu mới"
            leftSection={<IconLock size={18} />}
            size="md"
            radius="lg"
            autoComplete="new-password"
            disabled={submitting}
            className={
              confirmTouched
                ? confirmMatched
                  ? 'change-password-confirm-match'
                  : 'change-password-confirm-mismatch'
                : undefined
            }
            description={
              confirmTouched
                ? confirmMatched
                  ? 'Mật khẩu xác nhận đã khớp.'
                  : 'Mật khẩu xác nhận chưa khớp.'
                : undefined
            }
            {...form.getInputProps('confirmPassword')}
          />

          <Button
            type="submit"
            size="md"
            radius="lg"
            fullWidth
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
