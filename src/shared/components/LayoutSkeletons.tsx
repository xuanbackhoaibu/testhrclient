import { Card, Group, Paper, SimpleGrid, Skeleton, Stack } from '@mantine/core';

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Paper p="md" radius="md" className="layout-skeleton layout-skeleton-table">
      <Stack gap="sm">
        <Group justify="space-between">
          <Skeleton height={28} width={220} radius="sm" />
          <Skeleton height={36} width={132} radius="md" />
        </Group>
        <div className="layout-skeleton-table-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(96px, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`head-${index}`} height={32} radius="sm" />
          ))}
          {Array.from({ length: rows * columns }).map((_, index) => (
            <Skeleton key={`cell-${index}`} height={38} radius="sm" />
          ))}
        </div>
      </Stack>
    </Paper>
  );
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {Array.from({ length: cards }).map((_, index) => (
        <Card key={index} withBorder className="layout-skeleton">
          <Stack gap="sm">
            <Group>
              <Skeleton circle height={44} />
              <Stack gap={6} flex={1}>
                <Skeleton height={16} width="70%" />
                <Skeleton height={12} width="46%" />
              </Stack>
            </Group>
            <Skeleton height={64} radius="md" />
            <Group justify="space-between">
              <Skeleton height={24} width={88} />
              <Skeleton height={28} width={96} radius="md" />
            </Group>
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}

export function DetailSkeleton() {
  return (
    <Stack gap="md">
      <Paper p="lg" radius="md" className="layout-skeleton">
        <Group align="flex-start">
          <Skeleton circle height={72} />
          <Stack gap="xs" flex={1}>
            <Skeleton height={28} width="38%" />
            <Skeleton height={16} width="52%" />
            <Group gap="xs">
              <Skeleton height={24} width={92} radius="xl" />
              <Skeleton height={24} width={112} radius="xl" />
            </Group>
          </Stack>
        </Group>
      </Paper>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {Array.from({ length: 4 }).map((_, index) => (
          <Paper key={index} p="md" radius="md" className="layout-skeleton">
            <Stack gap="sm">
              <Skeleton height={20} width="42%" />
              <Skeleton height={14} />
              <Skeleton height={14} width="84%" />
              <Skeleton height={14} width="68%" />
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export function ChartSkeleton({ type = 'bar' }: { type?: 'bar' | 'donut' | 'area' }) {
  return (
    <Paper p="md" radius="md" className="layout-skeleton layout-skeleton-chart">
      <Group justify="space-between" mb="md">
        <Skeleton height={22} width={180} />
        <Skeleton height={30} width={96} radius="md" />
      </Group>
      {type === 'donut' ? (
        <Group justify="center" gap="xl">
          <Skeleton circle height={180} />
          <Stack gap="xs">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height={18} width={150} />
            ))}
          </Stack>
        </Group>
      ) : (
        <Stack gap="sm">
          {Array.from({ length: type === 'area' ? 5 : 7 }).map((_, index) => (
            <Group key={index} gap="sm">
              <Skeleton height={14} width={88} />
              <Skeleton height={26} width={`${92 - index * 8}%`} radius="sm" />
            </Group>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
