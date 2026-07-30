import {
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconArrowUpRight,
  IconBriefcase,
  IconCalendarTime,
  IconChevronRight,
  IconClipboardCheck,
  IconTrendingUp,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { useDashboardSummary } from "../features/dashboard/useDashboardSummary";
import { EmptyState } from "../shared/components/EmptyState";
import { ErrorState } from "../shared/components/ErrorState";
import { LoadingState } from "../shared/components/LoadingState";
import { ROUTES } from "../shared/constants/routes";
import "./DashboardPage.css";

type MetricTone = "blue" | "teal" | "violet" | "orange";

interface MetricCardProps {
  title: string;
  value: number;
  helper: string;
  icon: typeof IconUsers;
  tone: MetricTone;
}

const statusLabels: Record<string, string> = {
  ACTIVE: "Đang làm việc",
  PROBATION: "Thử việc",
  INACTIVE: "Tạm nghỉ",
  TERMINATED: "Đã nghỉ việc",
};

function MetricCard({ title, value, helper, icon: Icon, tone }: MetricCardProps) {
  return (
    <Paper className="dashboard-metric-card" p="lg" radius="lg" withBorder>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={6}>
          <Text className="dashboard-metric-label">{title}</Text>
          <Title order={3} className="dashboard-metric-value">{value.toLocaleString("vi-VN")}</Title>
          <Text size="xs" c="dimmed">{helper}</Text>
        </Stack>
        <ThemeIcon variant="light" color={tone} size={46} radius="md"><Icon size={23} stroke={1.8} /></ThemeIcon>
      </Group>
    </Paper>
  );
}

function DistributionCard({ title, subtitle, items, status = false }: { title: string; subtitle: string; items: Array<{ label: string; value: number }>; status?: boolean }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return <Paper className="dashboard-panel" p="lg" radius="lg" withBorder>
    <Group justify="space-between" mb="xl" wrap="nowrap"><Stack gap={2}><Text fw={700}>{title}</Text><Text size="xs" c="dimmed">{subtitle}</Text></Stack><ThemeIcon variant="light" color="blue" radius="md"><IconTrendingUp size={18} /></ThemeIcon></Group>
    <Stack gap="md">{items.length ? items.map((item, index) => {
      const percentage = total ? Math.round((item.value / total) * 100) : 0;
      const label = status ? (statusLabels[item.label] ?? item.label) : item.label;
      return <Stack key={item.label} gap={6}><Group justify="space-between" gap="md" wrap="nowrap">{status ? <Badge size="xs" variant="dot" color={index === 0 ? "teal" : "gray"}>{label}</Badge> : <Text size="sm">{label}</Text>}<Text size="sm" fw={700}>{item.value.toLocaleString("vi-VN")}</Text></Group><Progress value={percentage} color={index === 0 ? "teal" : index === 1 ? "blue" : "violet"} radius="xl" size={7} /></Stack>;
    }) : <Text size="sm" c="dimmed">Chưa có dữ liệu.</Text>}</Stack>
  </Paper>;
}

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboardSummary();
  const navigate = useNavigate();
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => void refetch()} />;
  if (!data) return <EmptyState />;

  const activeRate = data.totalEmployees ? Math.round((data.activeEmployees / data.totalEmployees) * 100) : 0;
  const dateLabel = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  const metrics: MetricCardProps[] = [
    { title: "Tổng nhân sự", value: data.totalEmployees, helper: `${activeRate}% đang hoạt động`, icon: IconUsers, tone: "blue" },
    { title: "Nhân sự mới", value: data.newHiresThisMonth, helper: "Tuyển mới trong tháng", icon: IconUserPlus, tone: "teal" },
    { title: "Yêu cầu chờ duyệt", value: data.pendingLeaveRequests + data.pendingMovements, helper: "Nghỉ phép và điều chuyển", icon: IconClipboardCheck, tone: "orange" },
    { title: "Quy trình đang chạy", value: data.onboardingInProgress + data.offboardingInProgress, helper: "Onboarding và offboarding", icon: IconBriefcase, tone: "violet" },
  ];

  return <Stack className="dashboard-page" gap="lg">
    <Paper className="dashboard-hero" p="xl" radius="xl">
      <div className="dashboard-hero-orb dashboard-hero-orb-one" /><div className="dashboard-hero-orb dashboard-hero-orb-two" />
      <Group justify="space-between" align="flex-end" gap="xl" className="dashboard-hero-content">
        <Stack gap="sm"><Badge variant="light" color="blue" radius="sm" w="fit-content">TRUNG TÂM ĐIỀU HÀNH NHÂN SỰ</Badge><div><Title order={1} className="dashboard-hero-title">Chào buổi làm việc hiệu quả</Title><Text className="dashboard-hero-subtitle">Theo dõi nhân sự, quy trình và các việc cần xử lý tại một nơi.</Text></div><Group gap="xs"><IconCalendarTime size={16} /><Text size="sm" fw={500} tt="capitalize">{dateLabel}</Text></Group></Stack>
        <Group gap="sm"><Button variant="white" color="dark" rightSection={<IconChevronRight size={16} />} onClick={() => navigate(ROUTES.employees)}>Danh sách nhân sự</Button><Button color="dark" rightSection={<IconArrowUpRight size={16} />} onClick={() => navigate(ROUTES.attendance)}>Chấm công</Button></Group>
      </Group>
    </Paper>
    <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">{metrics.map((metric) => <MetricCard key={metric.title} {...metric} />)}</SimpleGrid>
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md"><DistributionCard title="Cơ cấu theo đơn vị" subtitle="Phân bổ nhân sự hiện tại" items={data.employeesByUnit} /><DistributionCard title="Tình trạng nhân sự" subtitle="Cập nhật theo hồ sơ làm việc" items={data.employeesByEmploymentStatus} status /></SimpleGrid>
    <Paper className="dashboard-action-panel" p="lg" radius="lg" withBorder><Group justify="space-between" align="center" gap="md" wrap="wrap"><Group gap="sm" wrap="nowrap"><ThemeIcon size={42} radius="md" color="orange" variant="light"><IconClipboardCheck size={21} /></ThemeIcon><div><Text fw={700}>Việc cần ưu tiên</Text><Text size="sm" c="dimmed">Có {data.pendingLeaveRequests + data.pendingMovements} yêu cầu đang chờ được xử lý.</Text></div></Group><Button variant="subtle" rightSection={<IconChevronRight size={16} />} onClick={() => navigate(ROUTES.movements)}>Xem yêu cầu</Button></Group></Paper>
  </Stack>;
}
