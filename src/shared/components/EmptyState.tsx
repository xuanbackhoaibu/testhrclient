import type { ReactNode } from 'react';
import { Button, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconInbox, IconLockAccess, IconSearchOff } from '@tabler/icons-react';

export type EmptyStateVariant = 'empty' | 'search' | 'forbidden' | 'error';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: ReactNode;
}

const emptyStatePresets: Record<EmptyStateVariant, { title: string; description: string; actionLabel: string; color: string; icon: ReactNode }> = {
  empty: {
    title: 'Chưa có dữ liệu',
    description: 'Chưa có bản ghi nào trong khu vực này.',
    actionLabel: 'Tạo mới',
    color: 'blue',
    icon: <IconInbox size={22} />,
  },
  search: {
    title: 'Không có kết quả',
    description: 'Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.',
    actionLabel: 'Xóa lọc',
    color: 'gray',
    icon: <IconSearchOff size={22} />,
  },
  forbidden: {
    title: 'Không có quyền',
    description: 'Tài khoản hiện tại chưa được cấp quyền cho khu vực này.',
    actionLabel: 'Liên hệ admin',
    color: 'orange',
    icon: <IconLockAccess size={22} />,
  },
  error: {
    title: 'Lỗi tải dữ liệu',
    description: 'Không thể tải dữ liệu. Vui lòng thử lại sau ít phút.',
    actionLabel: 'Thử lại',
    color: 'red',
    icon: <IconAlertTriangle size={22} />,
  },
};

export function EmptyState({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
}: EmptyStateProps) {
  const preset = emptyStatePresets[variant];

  return (
    <Paper p="xl" radius="md" className="empty-state-surface">
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon size={48} radius="md" variant="light" color={preset.color} className="empty-state-icon">
          {icon ?? preset.icon}
        </ThemeIcon>
        <Title order={4} className="empty-state-title">{title ?? preset.title}</Title>
        <Text c="dimmed" size="sm" maw={360}>
          {description ?? preset.description}
        </Text>
        {(actionLabel || preset.actionLabel) && onAction ? (
          <Group gap="xs" mt="xs">
            <Button variant={variant === 'error' ? 'filled' : 'light'} color={preset.color} onClick={onAction}>
              {actionLabel ?? preset.actionLabel}
            </Button>
            {secondaryActionLabel && onSecondaryAction ? (
              <Button variant="default" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </Button>
            ) : null}
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
}
