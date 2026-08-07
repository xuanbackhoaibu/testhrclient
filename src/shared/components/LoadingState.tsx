import { Paper, Skeleton, Stack, Text } from '@mantine/core';

interface LoadingStateProps {
  tip?: string;
  compact?: boolean;
}

export function LoadingState({ tip = 'Đang tải dữ liệu...', compact = false }: LoadingStateProps) {
  return (
    <Paper p="lg" radius="md" className="loading-state-surface">
      <Stack gap="sm">
        <Text c="dimmed" size="sm" fw={600}>
          {tip}
        </Text>
        <Skeleton height={compact ? 28 : 44} radius="sm" />
        <Skeleton height={compact ? 28 : 44} radius="sm" />
        <Skeleton height={compact ? 28 : 44} radius="sm" width="82%" />
      </Stack>
    </Paper>
  );
}
