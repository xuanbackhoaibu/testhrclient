import { Card, Grid, Group, RingProgress, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconClockHour4,
  IconQuestionMark,
  IconUserCheck,
  IconUserX,
  IconUsers,
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
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card withBorder padding="sm" radius="md">
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
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Grid.Col key={i} span={{ base: 6, sm: 4, md: 3 }}>
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
  const mappedRate = summary.total > 0 ? ((summary.mapped + summary.autoMapped) / summary.total) * 100 : 0;
  const unmappedConflictRate = summary.total > 0 ? ((summary.unmapped + summary.conflict) / summary.total) * 100 : 0;

  return (
    <>
      <Grid gap="xs">
        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
          <StatCard label="Tổng bản ghi" value={summary.total} icon={IconUsers} color="blue" />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
          <StatCard label="Đủ công" value={summary.present} icon={IconCheck} color="green" />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
          <StatCard label="Đi muộn" value={summary.late} icon={IconClockHour4} color="yellow" />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
          <StatCard label="Chấm 1 lần" value={summary.singlePunch} icon={IconClock} color="orange" />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
          <StatCard label="Vắng" value={summary.absent} icon={IconUserX} color="red" />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Đã map"
            value={summary.mapped + summary.autoMapped}
            icon={IconUserCheck}
            color={summary.mapped + summary.autoMapped > 0 ? 'teal' : 'gray'}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Chưa map"
            value={summary.unmapped}
            icon={IconQuestionMark}
            color={summary.unmapped > 0 ? 'orange' : 'gray'}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
          <StatCard
            label="Trùng mã"
            value={summary.conflict}
            icon={IconAlertTriangle}
            color={summary.conflict > 0 ? 'red' : 'gray'}
          />
        </Grid.Col>
      </Grid>

      <Card withBorder padding="sm" radius="md" bg="gray.0" mt="xs">
        <Group gap="xl" wrap="wrap">
          <Group gap="xs">
            <RingProgress
              size={56}
              thickness={5}
              sections={[{ value: presentRate, color: 'green' }]}
              label={
                <Text size="xs" ta="center" fw={600}>
                  {presentRate.toFixed(0)}%
                </Text>
              }
            />
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Đủ công</Text>
              <Text size="sm" fw={600} c="green.7">
                {summary.present}/{summary.total}
              </Text>
            </Stack>
          </Group>

          <Group gap="xs">
            <RingProgress
              size={56}
              thickness={5}
              sections={[
                { value: mappedRate, color: 'teal' },
                ...(unmappedConflictRate > 0 ? [{ value: unmappedConflictRate, color: 'red' }] : []),
              ]}
              label={
                <Text size="xs" ta="center" fw={600}>
                  {mappedRate.toFixed(0)}%
                </Text>
              }
            />
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Đã map</Text>
              <Text size="sm" fw={600} c="teal.7">
                {summary.mapped + summary.autoMapped}/{summary.total}
              </Text>
            </Stack>
          </Group>

          {(summary.unmapped + summary.conflict) > 0 && (
            <Group gap="xs">
              <RingProgress
                size={56}
                thickness={5}
                sections={[
                  { value: summary.unmapped > 0 ? (summary.unmapped / summary.total) * 100 : 0, color: 'orange' },
                  { value: summary.conflict > 0 ? (summary.conflict / summary.total) * 100 : 0, color: 'red' },
                ]}
                label={
                  <Text size="xs" ta="center" fw={600}>
                    {(summary.unmapped + summary.conflict) > 0 ? ((summary.unmapped + summary.conflict) / summary.total * 100).toFixed(0) : '0'}%
                  </Text>
                }
              />
              <Stack gap={0}>
                <Text size="xs" c="dimmed">Cần xử lý</Text>
                <Text size="sm" fw={600} c="red.7">
                  {summary.unmapped + summary.conflict} bản ghi
                </Text>
              </Stack>
            </Group>
          )}
        </Group>
      </Card>
    </>
  );
}
