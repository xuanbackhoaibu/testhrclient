import type { ReactNode } from 'react';
import { Button, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Không có bản ghi phù hợp với bộ lọc hiện tại.',
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <Paper p="xl" radius="md">
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon size={42} radius="xl" variant="light" color="gray">
          {icon ?? <IconInbox size={22} />}
        </ThemeIcon>
        <Title order={4}>{title}</Title>
        <Text c="dimmed" size="sm" maw={360}>
          {description}
        </Text>
        {actionLabel && onAction ? (
          <Button variant="light" mt="xs" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}
