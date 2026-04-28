import { SimpleGrid, Group, Paper, Stack, Text, Title } from '@mantine/core';

import { useDashboardSummary } from '../features/dashboard/useDashboardSummary';
import { EmptyState } from '../shared/components/EmptyState';
import { ErrorState } from '../shared/components/ErrorState';
import { LoadingState } from '../shared/components/LoadingState';
import { PageHeader } from '../shared/components/PageHeader';

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Paper p="md" radius="md">
      <Stack gap={4}>
        <Text c="dimmed" size="sm">
          {title}
        </Text>
        <Title order={3}>{value.toLocaleString('vi-VN')}</Title>
      </Stack>
    </Paper>
  );
}

function BreakdownList({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  return (
    <Paper p="md" radius="md">
      <Stack gap="sm">
        <Text fw={650}>{title}</Text>
        {items.map((item) => (
          <Group key={item.label} justify="space-between" gap="md">
            <Text size="sm" c="dimmed">
              {item.label}
            </Text>
            <Text size="sm" fw={650}>
              {item.value.toLocaleString('vi-VN')}
            </Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboardSummary();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  const metrics = [
    { title: 'Tổng nhân sự', value: data.totalEmployees },
    { title: 'Đang làm việc', value: data.activeEmployees },
    { title: 'Tuyển mới tháng này', value: data.newHiresThisMonth },
    { title: 'Nghỉ việc tháng này', value: data.terminatedThisMonth },
    { title: 'Đơn nghỉ phép chờ duyệt', value: data.pendingLeaveRequests },
    { title: 'Điều chuyển chờ xử lý', value: data.pendingMovements },
    { title: 'Onboarding đang chạy', value: data.onboardingInProgress },
    { title: 'Offboarding đang chạy', value: data.offboardingInProgress },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Tổng quan ngắn gọn cho vận hành HRM. Chi tiết nghiệp vụ xử lý trong từng phân hệ."
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} title={metric.title} value={metric.value} />
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <BreakdownList title="Nhân sự theo pháp nhân" items={data.employeesByUnit} />
          <BreakdownList title="Nhân sự theo trạng thái" items={data.employeesByEmploymentStatus} />
        </SimpleGrid>
      </Stack>
    </>
  );
}
