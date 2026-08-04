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
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowUpRight,
  IconBriefcase,
  IconCalendarTime,
  IconChevronRight,
  IconClipboardCheck,
  IconTrendingUp,
  IconUserMinus,
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

type MetricTone = "blue" | "teal" | "violet" | "orange" | "red";

interface MetricCardProps {
  title: string;
  value: number;
  helper: string;
  icon: typeof IconUsers;
  tone: MetricTone;
  onClick?: () => void;
}

interface ActionItem {
  label: string;
  description: string;
  count: number;
  icon: typeof IconUsers;
  tone: MetricTone;
  onClick: () => void;
}

const statusLabels: Record<string, string> = {
  ACTIVE: "Đang làm việc",
  PROBATION: "Thử việc",
  INACTIVE: "Tạm nghỉ",
  TERMINATED: "Đã nghỉ việc",
};

// 4 chỉ số cốt lõi, mỗi thẻ 1 giá trị duy nhất, tiêu đề ngắn — cố tình giữ
// bố cục đơn giản 4 cột để không lặp lại lỗi tiêu đề dài tràn dòng khi nhồi
// quá nhiều số vào 1 hàng.
function MetricCard({ title, value, helper, icon: Icon, tone, onClick }: MetricCardProps) {
  const content = (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={6} style={{ minWidth: 0 }}>
        <Text className="dashboard-metric-label">{title}</Text>
        <Title order={2} className="dashboard-metric-value">
          {value.toLocaleString("vi-VN")}
        </Title>
        <Text className="dashboard-metric-helper" size="xs" c="dimmed">
          {helper}
        </Text>
      </Stack>
      <ThemeIcon variant="light" color={tone} size={44} radius="md">
        <Icon size={22} stroke={1.8} />
      </ThemeIcon>
    </Group>
  );

  if (!onClick) {
    return (
      <Paper className="dashboard-metric-card" p="lg" radius="lg" withBorder>
        {content}
      </Paper>
    );
  }

  return (
    <UnstyledButton onClick={onClick} className="dashboard-metric-card-button">
      <Paper className="dashboard-metric-card dashboard-metric-card-clickable" p="lg" radius="lg" withBorder>
        {content}
      </Paper>
    </UnstyledButton>
  );
}

// Gộp toàn bộ số liệu "cần xử lý" (nghỉ phép, điều chuyển, onboarding,
// offboarding) vào MỘT nơi duy nhất dạng danh sách — tránh lặp lại việc
// nhồi 2 loại số liệu khác nhau vào chung 1 thẻ nhỏ như bản trước.
function ActionRow({ label, description, count, icon: Icon, tone, onClick }: ActionItem) {
  return (
    <Group justify="space-between" align="center" gap="md" wrap="wrap" className="dashboard-action-row">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon size={38} radius="md" color={tone} variant="light">
          <Icon size={19} />
        </ThemeIcon>
        <div>
          <Text size="sm" fw={600}>
            {label}
          </Text>
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        </div>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <Badge size="lg" variant="light" color={tone} radius="sm">
          {count.toLocaleString("vi-VN")}
        </Badge>
        <Button variant="subtle" size="xs" rightSection={<IconChevronRight size={14} />} onClick={onClick}>
          Xem
        </Button>
      </Group>
    </Group>
  );
}

function DistributionCard({
  title,
  subtitle,
  items,
  status = false,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number }>;
  status?: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <Paper className="dashboard-panel" p="lg" radius="lg" withBorder>
      <Group justify="space-between" mb="xl" wrap="nowrap">
        <Stack gap={2}>
          <Text fw={700}>{title}</Text>
          <Text size="xs" c="dimmed">
            {subtitle}
          </Text>
        </Stack>
        <ThemeIcon variant="light" color="blue" radius="md">
          <IconTrendingUp size={18} />
        </ThemeIcon>
      </Group>
      <Stack gap="md">
        {items.length ? (
          items.map((item, index) => {
            const percentage = total ? Math.round((item.value / total) * 100) : 0;
            const label = status ? (statusLabels[item.label] ?? item.label) : item.label;
            return (
              <Stack key={item.label} gap={6}>
                <Group justify="space-between" gap="md" wrap="nowrap">
                  {status ? (
                    <Badge size="xs" variant="dot" color={index === 0 ? "teal" : "gray"}>
                      {label}
                    </Badge>
                  ) : (
                    <Text size="sm">{label}</Text>
                  )}
                  <Text size="sm" fw={700}>
                    {item.value.toLocaleString("vi-VN")}
                  </Text>
                </Group>
                <Progress
                  value={percentage}
                  color={index === 0 ? "teal" : index === 1 ? "blue" : "violet"}
                  radius="xl"
                  size={7}
                />
              </Stack>
            );
          })
        ) : (
          <Text size="sm" c="dimmed">
            Chưa có dữ liệu.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboardSummary();
  const navigate = useNavigate();
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => void refetch()} />;
  if (!data) return <EmptyState />;

  const activeRate = data.totalEmployees
    ? Math.round((data.activeEmployees / data.totalEmployees) * 100)
    : 0;
  const dateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  const metrics: MetricCardProps[] = [
    {
      title: "Tổng nhân sự",
      value: data.totalEmployees,
      helper: `${data.activeEmployees.toLocaleString("vi-VN")} đang hoạt động`,
      icon: IconUsers,
      tone: "blue",
      onClick: () => navigate(ROUTES.employees),
    },
    {
      title: "Tỷ lệ hoạt động",
      value: activeRate,
      helper: "% nhân sự đang làm việc",
      icon: IconTrendingUp,
      tone: "teal",
    },
    {
      title: "Nhân sự mới",
      value: data.newHiresThisMonth,
      helper: "Tuyển mới trong tháng",
      icon: IconUserPlus,
      tone: "violet",
      onClick: () => navigate(`${ROUTES.employees}?newHires=1`),
    },
    {
      title: "Nghỉ việc",
      value: data.terminatedThisMonth,
      helper: "Chấm dứt hợp đồng trong tháng",
      icon: IconUserMinus,
      tone: "red",
      onClick: () => navigate(`${ROUTES.employees}?status=TERMINATED`),
    },
  ];

  const allActionItems: ActionItem[] = [
    {
      label: "Nghỉ phép chờ duyệt",
      description: "Yêu cầu nghỉ phép đang chờ xử lý",
      count: data.pendingLeaveRequests,
      icon: IconClipboardCheck,
      tone: "orange",
      onClick: () => navigate(ROUTES.leave),
    },
    {
      label: "Điều chuyển chờ xử lý",
      description: "Đề nghị điều chuyển đang chờ phê duyệt",
      count: data.pendingMovements,
      icon: IconArrowUpRight,
      tone: "blue",
      onClick: () => navigate(ROUTES.movements),
    },
    {
      label: "Onboarding đang chạy",
      description: "Đợt hòa nhập nhân sự mới đang thực hiện",
      count: data.onboardingInProgress,
      icon: IconBriefcase,
      tone: "teal",
      onClick: () => navigate(ROUTES.onboarding),
    },
    {
      label: "Offboarding đang chạy",
      description: "Đợt bàn giao nghỉ việc đang thực hiện",
      count: data.offboardingInProgress,
      icon: IconBriefcase,
      tone: "violet",
      onClick: () => navigate(ROUTES.offboarding),
    },
  ];
  const actionItems = allActionItems.filter((item) => item.count > 0);

  return (
    <Stack className="dashboard-page" gap="lg">
      <Paper className="dashboard-hero" p="xl" radius="xl">
        <div className="dashboard-hero-orb dashboard-hero-orb-one" />
        <div className="dashboard-hero-orb dashboard-hero-orb-two" />
        <Group justify="space-between" align="flex-end" gap="xl" className="dashboard-hero-content">
          <Stack gap="sm">
            <Badge variant="light" color="blue" radius="sm" w="fit-content">
              TRUNG TÂM ĐIỀU HÀNH NHÂN SỰ
            </Badge>
            <div>
              <Title order={1} className="dashboard-hero-title">
                Chào buổi làm việc hiệu quả
              </Title>
              <Text className="dashboard-hero-subtitle">
                Theo dõi nhân sự, quy trình và các việc cần xử lý tại một nơi.
              </Text>
            </div>
            <Group gap="xs">
              <IconCalendarTime size={16} />
              <Text size="sm" fw={500} tt="capitalize">
                {dateLabel}
              </Text>
            </Group>
          </Stack>
          <Group gap="sm">
            <Button
              variant="white"
              color="dark"
              rightSection={<IconChevronRight size={16} />}
              onClick={() => navigate(ROUTES.employees)}
            >
              Danh sách nhân sự
            </Button>
            <Button color="dark" rightSection={<IconArrowUpRight size={16} />} onClick={() => navigate(ROUTES.attendance)}>
              Chấm công
            </Button>
          </Group>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </SimpleGrid>

      <Paper className="dashboard-panel dashboard-action-panel" p="lg" radius="lg" withBorder>
        <Stack gap={2} mb="lg">
          <Text fw={700}>Việc cần xử lý</Text>
          <Text size="xs" c="dimmed">
            Tổng hợp các yêu cầu và quy trình đang chờ bạn
          </Text>
        </Stack>
        {actionItems.length ? (
          <Stack gap="xs">
            {actionItems.map((item, index) => (
              <div key={item.label}>
                <ActionRow {...item} />
                {index < actionItems.length - 1 ? <div className="dashboard-action-divider" /> : null}
              </div>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Không có yêu cầu nào đang chờ xử lý. 🎉
          </Text>
        )}
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <DistributionCard
          title="Cơ cấu theo đơn vị"
          subtitle="Phân bổ nhân sự hiện tại"
          items={data.employeesByUnit}
        />
        <DistributionCard
          title="Tình trạng nhân sự"
          subtitle="Cập nhật theo hồ sơ làm việc"
          items={data.employeesByEmploymentStatus}
          status
        />
      </SimpleGrid>
    </Stack>
  );
}
