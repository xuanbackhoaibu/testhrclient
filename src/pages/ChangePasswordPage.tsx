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

import { getCurrentUser } from '../features/auth/authApi';
import {
  getAccessToken,
  setAccessToken,
  setSessionUser,
} from '../features/auth/authClient';
import {
  getPasswordPolicyChecks,
  PASSWORD_LENGTH,
  validatePasswordPolicy,
} from '../features/auth/passwordPolicy';
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

function validateNewPassword(value: string): string | null {
  return validatePasswordPolicy(value);
}

export function ChangePasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<ChangePasswordForm>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      currentPassword: (value) => (value ? null : 'Nhap mat khau hien tai.'),
      newPassword: validateNewPassword,
      confirmPassword: (value, values) =>
        value !== values.newPassword ? 'Xac nhan mat khau khong khop.' : null,
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
        throw new Error('Tai khoan van bi yeu cau doi mat khau sau khi cap nhat.');
      }

      notifications.show({
        color: 'green',
        title: 'Doi mat khau thanh cong',
        message: 'Ban co the tiep tuc su dung he thong.',
      });

      if (data?.accessToken) {
        setAccessToken(data.accessToken);
        setSessionUser(null);
        setSession({ accessToken: data.accessToken, user: null });

        try {
          const currentUser = await getCurrentUser();
          setSessionUser(currentUser);
        } catch {
          // The app shell will rehydrate the user after redirect if needed.
        }

        window.location.assign(ROUTES.dashboard);
        return;
      }

      window.location.assign(ROUTES.login);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string } | undefined;
        setError(payload?.message ?? 'Doi mat khau that bai. Vui long thu lai.');
      } else {
        setError(err instanceof Error ? err.message : 'Doi mat khau that bai.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={4}>Doi mat khau bat buoc</Title>
        <Text c="dimmed" size="sm">
          Ban dang su dung mat khau tam thoi. Vui long doi mat khau de tiep tuc.
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
            label="Mat khau hien tai"
            placeholder="Mat khau hien tai"
            leftSection={<IconLock size={18} />}
            autoComplete="current-password"
            disabled={submitting}
            {...form.getInputProps('currentPassword')}
          />

          <PasswordInput
            label="Mat khau moi"
            placeholder={`Dung ${PASSWORD_LENGTH} ky tu`}
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
            label="Xac nhan mat khau moi"
            placeholder="Nhap lai mat khau moi"
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
            Doi mat khau
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
