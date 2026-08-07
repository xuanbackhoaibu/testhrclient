import {
  Badge,
  Box,
  Card,
  Divider,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { useDashboardSummary } from "../features/dashboard/useDashboardSummary";
import type { DashboardMetric } from "../features/dashboard/dashboardTypes";
import { EmptyState } from "../shared/components/EmptyState";
import { ErrorState } from "../shared/components/ErrorState";
import { LoadingState } from "../shared/components/LoadingState";
import { PageHeader } from "../shared/components/PageHeader";
import styles from "./DashboardPage.module.css";

type MetricTone = "blue" | "green" | "teal" | "red" | "yellow" | "orange" | "indigo" | "gray";

interface MetricCardProps {
  title: string;
  value: number;
  tone: MetricTone;
  description: string;
}

function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function MetricCard({ title, value, tone, description }: MetricCardProps) {
  return (
    <Paper className={`${styles.metricCard} ${styles[`metricCard_${tone}`]}`} p="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
        <Stack gap={8}>
          <Text size="xs" fw={700} c="dimmed" className={styles.metricLabel}>
            {title}
          </Text>
          <Title order={3} className={styles.metricValue}>
            {formatNumber(value)}
          </Title>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {description}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}

function SummaryTile({
  label,
  value,
  suffix,
  tone = "blue",
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: MetricTone;
}) {
  return (
    <Box className={`${styles.summaryTile} ${styles[`summaryTile_${tone}`]}`}>
      <Text size="xs" fw={700} c="dimmed" className={styles.metricLabel}>
        {label}
      </Text>
      <Group gap={6} align="baseline" wrap="nowrap">
        <Title order={3} className={styles.summaryValue}>
          {value}
        </Title>
        {suffix ? (
          <Text size="sm" c="dimmed">
            {suffix}
          </Text>
        ) : null}
      </Group>
    </Box>
  );
}

function BreakdownPanel({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: DashboardMetric[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const visibleItems = items.slice(0, 6);

  return (
    <Card withBorder padding="lg" radius="md" className={styles.panel}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="md">
          <Stack gap={2}>
            <Text fw={750}>{title}</Text>
            <Text size="sm" c="dimmed">
              {subtitle}
            </Text>
          </Stack>
          <Badge variant="light" color="blue">
            {formatNumber(total)}
          </Badge>
        </Group>

        <Stack gap="sm">
          {visibleItems.map((item) => {
            const itemPercent = percent(item.value, total);
            return (
              <Box key={item.label}>
                <Group justify="space-between" gap="md" mb={6} wrap="nowrap">
                  <Text size="sm" fw={600} truncate>
                    {item.label}
                  </Text>
                  <Text size="sm" fw={750} className={styles.tabular}>
                    {formatNumber(item.value)}
                  </Text>
                </Group>
                <Progress value={itemPercent} size="sm" radius="xl" color="blue" />
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}

function PriorityPanel({
  pendingLeaveRequests,
  pendingMovements,
  onboardingInProgress,
  offboardingInProgress,
}: {
  pendingLeaveRequests: number;
  pendingMovements: number;
  onboardingInProgress: number;
  offboardingInProgress: number;
}) {
  const queue = [
    {
      label: "Đơn nghỉ phép chờ duyệt",
      value: pendingLeaveRequests,
      color: "yellow",
    },
    {
      label: "Điều chuyển chờ xử lý",
      value: pendingMovements,
      color: "orange",
    },
    {
      label: "Onboarding đang chạy",
      value: onboardingInProgress,
      color: "indigo",
    },
    {
      label: "Offboarding đang chạy",
      value: offboardingInProgress,
      color: "gray",
    },
  ];

  const totalQueue = queue.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card withBorder padding="lg" radius="md" className={styles.panel}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text fw={750}>Việc cần theo dõi</Text>
            <Text size="sm" c="dimmed">
              Các nhóm nghiệp vụ đang chờ xử lý trong HRM.
            </Text>
          </Stack>
          <Badge variant="light" color={totalQueue > 0 ? "orange" : "green"} radius="sm">
            {formatNumber(totalQueue)}
          </Badge>
        </Group>

        <Divider />

        <Stack gap="xs">
          {queue.map((item) => {
            return (
              <Group
                key={item.label}
                justify="space-between"
                wrap="nowrap"
                className={`${styles.queueRow} ${styles[`queueRow_${item.color}`]}`}
              >
                <Text size="sm" fw={600} truncate>
                  {item.label}
                </Text>
                <Text size="sm" fw={800} className={styles.tabular}>
                  {formatNumber(item.value)}
                </Text>
              </Group>
            );
          })}
        </Stack>
      </Stack>
    </Card>
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

  const activePercent = percent(data.activeEmployees, data.totalEmployees);
  const monthlyChange = data.newHiresThisMonth - data.terminatedThisMonth;
  const queueTotal =
    data.pendingLeaveRequests +
    data.pendingMovements +
    data.onboardingInProgress +
    data.offboardingInProgress;

  const metrics: MetricCardProps[] = [
    {
      title: "Tổng nhân sự",
      value: data.totalEmployees,
      tone: "blue",
      description: "Quy mô nhân sự đang được quản lý trong hệ thống.",
    },
    {
      title: "Đang làm việc",
      value: data.activeEmployees,
      tone: "green",
      description: `${activePercent}% trên tổng nhân sự.`,
    },
    {
      title: "Tuyển mới tháng này",
      value: data.newHiresThisMonth,
      tone: "teal",
      description: "Nhân sự mới phát sinh trong tháng hiện tại.",
    },
    {
      title: "Nghỉ việc tháng này",
      value: data.terminatedThisMonth,
      tone: "red",
      description: "Hồ sơ đã kết thúc trong tháng hiện tại.",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Tổng quan vận hành HRM cho quản trị hệ thống và đội HR."
      />

      <Stack gap="lg">
        <Paper className={styles.overviewPanel} p="lg">
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start" gap="md">
              <Group gap="sm" wrap="nowrap">
                <Stack gap={2}>
                  <Text fw={750}>Tình hình nhân sự hiện tại</Text>
                  <Text size="sm" c="dimmed">
                    Theo dõi nhanh quy mô, biến động và hàng chờ xử lý.
                  </Text>
                </Stack>
              </Group>
              <Badge variant="light" color={queueTotal > 0 ? "orange" : "green"} radius="sm">
                {queueTotal > 0 ? `${formatNumber(queueTotal)} việc cần xử lý` : "Không có hàng chờ"}
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <SummaryTile label="Tỷ lệ đang làm việc" value={`${activePercent}%`} suffix="active" tone="green" />
              <SummaryTile
                label="Biến động tháng"
                value={`${monthlyChange >= 0 ? "+" : ""}${formatNumber(monthlyChange)}`}
                suffix="net"
                tone={monthlyChange >= 0 ? "teal" : "red"}
              />
              <SummaryTile label="Hàng chờ xử lý" value={formatNumber(queueTotal)} suffix="việc" tone="orange" />
            </SimpleGrid>

            <Box>
              <Group justify="space-between" mb={6}>
                <Text size="sm" fw={650}>
                  Tỷ lệ nhân sự active
                </Text>
                <Text size="sm" c="dimmed" className={styles.tabular}>
                  {formatNumber(data.activeEmployees)} / {formatNumber(data.totalEmployees)}
                </Text>
              </Group>
              <Progress value={activePercent} size="sm" radius="xl" color="blue" className={styles.overviewProgress} />
            </Box>
          </Stack>
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
          <Box className={styles.priorityColumn}>
            <PriorityPanel
              pendingLeaveRequests={data.pendingLeaveRequests}
              pendingMovements={data.pendingMovements}
              onboardingInProgress={data.onboardingInProgress}
              offboardingInProgress={data.offboardingInProgress}
            />
          </Box>
          <BreakdownPanel
            title="Nhân sự theo đơn vị"
            subtitle="Phân bổ nhân sự theo từng đơn vị vận hành."
            items={data.employeesByUnit}
          />
          <BreakdownPanel
            title="Nhân sự theo trạng thái"
            subtitle="Theo dõi cơ cấu trạng thái hồ sơ nhân sự."
            items={data.employeesByEmploymentStatus}
          />
        </SimpleGrid>
      </Stack>
    </>
  );
}
