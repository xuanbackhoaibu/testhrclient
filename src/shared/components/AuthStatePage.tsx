import type { ReactNode } from 'react';
import { Box, Button, Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import {
  IconAlertTriangle,
  IconHome,
  IconLockAccess,
  IconLogin,
  IconMessageCircle,
  IconRefresh,
  IconSearchOff,
} from '@tabler/icons-react';

import { ROUTES } from '../constants/routes';

export type AuthStateVariant = '403' | '404' | 'error' | 'session';

const variantConfig = {
  '403': {
    icon: IconLockAccess,
    color: 'orange',
    eyebrow: 'Không có quyền',
  },
  '404': {
    icon: IconSearchOff,
    color: 'hacomRed',
    eyebrow: 'Không tìm thấy',
  },
  error: {
    icon: IconAlertTriangle,
    color: 'red',
    eyebrow: 'Có lỗi xảy ra',
  },
  session: {
    icon: IconLogin,
    color: 'teal',
    eyebrow: 'Phiên đăng nhập',
  },
} as const;

export function AuthStatePage({
  variant,
  title,
  description,
  details,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  children,
}: {
  variant: AuthStateVariant;
  title: string;
  description: string;
  details?: ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  children?: ReactNode;
}) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Box className="auth-state-page">
      <Card withBorder className={`auth-state-card auth-state-card-${variant}`}>
        <Stack align="center" gap="md">
          <Box className="auth-state-illustration">
            <ThemeIcon size={72} radius="xl" color={config.color} variant="light">
              <Icon size={38} />
            </ThemeIcon>
            <span className="auth-state-illustration-ring" />
          </Box>
          <Stack gap={6} align="center">
            <Text size="xs" fw={800} tt="uppercase" c={`${config.color}.7`}>
              {config.eyebrow}
            </Text>
            <Title order={2} ta="center">{title}</Title>
            <Text c="dimmed" ta="center" maw={520}>{description}</Text>
          </Stack>
          {details ? <Box className="auth-state-details">{details}</Box> : null}
          {children}
          <Group justify="center" gap="sm">
            <Button
              leftSection={variant === 'session' ? <IconLogin size={16} /> : <IconHome size={16} />}
              onClick={onPrimary ?? (() => window.location.assign(variant === 'session' ? ROUTES.login : ROUTES.root))}
            >
              {primaryLabel ?? (variant === 'session' ? 'Đăng nhập lại' : 'Về dashboard')}
            </Button>
            <Button
              variant="default"
              leftSection={variant === 'error' ? <IconRefresh size={16} /> : <IconMessageCircle size={16} />}
              onClick={onSecondary ?? (() => window.location.assign('mailto:admin@hacom.vn'))}
            >
              {secondaryLabel ?? (variant === 'error' ? 'Tải lại' : 'Liên hệ admin')}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Box>
  );
}
