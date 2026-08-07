import { SimpleGrid, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconBriefcase,
  IconCalendarQuestion,
  IconDoorExit,
  IconExchange,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
  IconUserX,
} from "@tabler/icons-react";

import { useDashboardSummary } from "../features/dashboard/useDashboardSummary";
import { EmptyState } from "../shared/components/EmptyState";
import { ErrorState } from "../shared/components/ErrorState";
import { LoadingState } from "../shared/components/LoadingState";
import { PageHeader } from "../shared/components/PageHeader";

function MetricCard({
  title,
  value,
  color,
  icon: Icon,
}: {
  title: string;
  value: number;
  color: string;
  icon: typeof IconUsers;
}) {
  return (
    <Paper p="md" radius="md" className="dashboard-metric-card">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text c="dimmed" size="sm" fw={600}>
            {title}
          </Text>
          <Title order={3} className="dashboard-metric-value">
            {value.toLocaleString("vi-VN")}
          </Title>
        </Stack>
        <ThemeIcon variant="light" color={color} radius="md" size={38}>
          <Icon size={20} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <Paper p="md" radius="md" className="dashboard-breakdown-card">
      <Stack gap="sm">
        <Text fw={650}>{title}</Text>
        {items.map((item) => (
          <Group key={item.label} justify="space-between" gap="md">
            <Text size="sm" c="dimmed">
              {item.label}
            </Text>
            <Text size="sm" fw={650}>
              {item.value.toLocaleString("vi-VN")}
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
    { title: "Tổng nhân sự", value: data.totalEmployees, color: "blue", icon: IconUsers },
    { title: "Đang làm việc", value: data.activeEmployees, color: "green", icon: IconUserCheck },
    { title: "Tuyển mới tháng này", value: data.newHiresThisMonth, color: "teal", icon: IconUserPlus },
    { title: "Nghỉ việc tháng này", value: data.terminatedThisMonth, color: "red", icon: IconUserX },
    { title: "Đơn nghỉ phép chờ duyệt", value: data.pendingLeaveRequests, color: "yellow", icon: IconCalendarQuestion },
    { title: "Điều chuyển chờ xử lý", value: data.pendingMovements, color: "orange", icon: IconExchange },
    { title: "Onboarding đang chạy", value: data.onboardingInProgress, color: "indigo", icon: IconBriefcase },
    { title: "Offboarding đang chạy", value: data.offboardingInProgress, color: "gray", icon: IconDoorExit },
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
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              color={metric.color}
              icon={metric.icon}
            />
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <BreakdownList
            title="Nhân sự theo đơn vị"
            items={data.employeesByUnit}
          />
          <BreakdownList
            title="Nhân sự theo trạng thái"
            items={data.employeesByEmploymentStatus}
          />
        </SimpleGrid>
      </Stack>
    </>
  );
}
