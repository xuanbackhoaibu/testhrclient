import { Paper, Skeleton, Stack, Text } from '@mantine/core';

import { CardGridSkeleton, ChartSkeleton, DetailSkeleton, TableSkeleton } from './LayoutSkeletons';

interface LoadingStateProps {
  tip?: string;
  compact?: boolean;
  layout?: 'default' | 'table' | 'cards' | 'detail' | 'chart';
}

export function LoadingState({ tip = 'Đang tải dữ liệu...', compact = false, layout = 'default' }: LoadingStateProps) {
  if (layout === 'table') return <TableSkeleton rows={compact ? 4 : 8} />;
  if (layout === 'cards') return <CardGridSkeleton cards={compact ? 3 : 6} />;
  if (layout === 'detail') return <DetailSkeleton />;
  if (layout === 'chart') return <ChartSkeleton />;

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
