import { Card, Grid, Group, RingProgress, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconCheck,
  IconClock,
  IconClockHour4,
  IconQuestionMark,
  IconUsers,
  IconUserX,
} from '@tabler/icons-react';
import type { AttendanceSummary } from '../../../features/attendance/attendanceTypes';

interface AttendanceSummaryCardsProps {
  summary: AttendanceSummary | undefined;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: typeof IconUsers;
  color: string;
  onClick?: () => void;
}

function StatCard({ label, value, icon: Icon, color, onClick }: StatCardProps) {
  return (
    <Card
      withBorder
      padding="sm"
      radius="md"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon size="md" variant="light" color={color} radius="xl">
          <Icon size={14} />
        </ThemeIcon>
        <Stack gap={0}>
          <Text size="xs" c="dimmed" lh={1.2}>{label}</Text>
          <Text size="lg" fw={700} lh={1.2} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {value.toLocaleString('vi-VN')}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}

export function AttendanceSummaryCards({ summary }: AttendanceSummaryCardsProps) {
  if (!summary) {
    return (
      <Grid gap="xs">
        {[1, 2, 3, 4, 5].map((i) => (
          <Grid.Col key={i} span={{ base: 6, sm: 4, md: 2 }}>
            <Card withBorder padding="sm" radius="md">
              <Stack gap={4}>
                <Text size="xs" c="dimmed">—</Text>
                <Text size="lg" fw={700}>—</Text>
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    );
  }

  const presentRate = summary.total > 0 ? (summary.present / summary.total) * 100 : 0;
  const unmappedRate = summary.total > 0 ? (summary.unmapped / summary.total) * 100 : 0;

  return (
    <Grid gap="xs">
      <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
        <StatCard
          label="Tổng bản ghi"
          value={summary.total}
          icon={IconUsers}
          color="blue"
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
        <StatCard
          label="Đủ công"
          value={summary.present}
          icon={IconCheck}
          color="green"
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
        <StatCard
          label="Đi muộn"
          value={summary.late}
          icon={IconClockHour4}
          color="yellow"
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
        <StatCard
          label="Chấm 1 lần"
          value={summary.singlePunch}
          icon={IconClock}
          color="orange"
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
        <StatCard
          label="Vắng"
          value={summary.absent}
          icon={IconUserX}
          color="red"
        />
      </Grid.Col>
      <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
        <StatCard
          label="Chưa map"
          value={summary.unmapped}
          icon={IconQuestionMark}
          color={summary.unmapped > 0 ? 'red' : 'gray'}
        />
      </Grid.Col>

      {/* Progress indicators */}
      <Grid.Col span={12}>
        <Card withBorder padding="sm" radius="md" bg="gray.0">
          <Group gap="lg" wrap="wrap">
            <Group gap="xs">
              <RingProgress
                size={48}
                thickness={4}
                sections={[{ value: presentRate, color: 'green' }]}
                label={
                  <Text size="xs" ta="center" fw={600}>
                    {presentRate.toFixed(0)}%
                  </Text>
                }
              />
              <Stack gap={0}>
                <Text size="xs" c="dimmed">Tỷ lệ đủ công</Text>
                <Text size="sm" fw={600} c="green.7">
                  {summary.present}/{summary.total}
                </Text>
              </Stack>
            </Group>

            {summary.unmapped > 0 && (
              <Group gap="xs">
                <RingProgress
                  size={48}
                  thickness={4}
                  sections={[{ value: unmappedRate, color: 'red' }]}
                  label={
                    <Text size="xs" ta="center" fw={600}>
                      {unmappedRate.toFixed(0)}%
                    </Text>
                  }
                />
                <Stack gap={0}>
                  <Text size="xs" c="dimmed">Chưa map</Text>
                  <Text size="sm" fw={600} c="red.7">
                    {summary.unmapped} nhân sự
                  </Text>
                </Stack>
              </Group>
            )}
          </Group>
        </Card>
      </Grid.Col>
    </Grid>
  );
}
