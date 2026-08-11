import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
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
import { PageHeader } from "../shared/components/PageHeader";
import { StatusTag } from "../shared/components/StatusTag";
import { ROUTES } from "../shared/constants/routes";
import "./DashboardPage.css";

type MetricTone = "blue" | "green" | "red" | "gray";

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
  onClick: () => void;
}

// 4 chỉ số cốt lõi, mỗi thẻ 1 giá trị duy nhất, tiêu đề ngắn — cố tình giữ
// bố cục đơn giản 4 cột để không lặp lại lỗi tiêu đề dài tràn dòng khi nhồi
// quá nhiều số vào 1 hàng. Tông màu dùng chung bảng màu ngữ nghĩa với
// StatusTag (blue/green/red/gray) thay vì phối màu tùy ý riêng cho trang này.
function MetricCard({ title, value, helper, icon: Icon, tone, onClick }: MetricCardProps) {
  const content = (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={4} style={{ minWidth: 0 }}>
        <Text size="sm" c="dimmed" fw={500} className="dashboard-metric-label">
          {title}
        </Text>
        <Text fw={700} className="dashboard-metric-value">
          {value.toLocaleString("vi-VN")}
        </Text>
        <Text size="xs" c="dimmed" className="dashboard-metric-helper">
          {helper}
        </Text>
      </Stack>
      <ThemeIcon variant="light" color={tone} size={36} radius="md">
        <Icon size={19} stroke={1.8} />
      </ThemeIcon>
    </Group>
  );

  if (!onClick) {
    return (
      <Paper className="page-card" p="md" withBorder>
        {content}
      </Paper>
    );
  }

  return (
    <Paper
      component="button"
      type="button"
      onClick={onClick}
      className="page-card dashboard-metric-card-button"
      p="md"
      withBorder
    >
      {content}
    </Paper>
  );
}

// Gộp toàn bộ số liệu "cần xử lý" (nghỉ phép, điều chuyển, onboarding,
// offboarding) vào MỘT nơi duy nhất dạng danh sách — tránh lặp lại việc
// nhồi 2 loại số liệu khác nhau vào chung 1 thẻ nhỏ như bản trước.
function ActionRow({ label, description, count, icon: Icon, onClick }: ActionItem) {
  return (
    <Group justify="space-between" align="center" gap="md" wrap="wrap" className="dashboard-action-row">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon size={34} radius="md" color="gray" variant="light">
          <Icon size={17} />
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
        <Badge size="lg" variant="light" color="blue" radius="sm" tt="none" fw={600}>
          {count.toLocaleString("vi-VN")}
        </Badge>
        <Button variant="subtle" color="gray" size="xs" rightSection={<IconChevronRight size={14} />} onClick={onClick}>
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
    <Paper className="page-card" p="md" withBorder>
      <Stack gap={2} mb="md">
        <Text fw={700} size="sm">
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {subtitle}
        </Text>
      </Stack>
      <Stack gap="md">
        {items.length ? (
          items.map((item) => {
            const percentage = total ? Math.round((item.value / total) * 100) : 0;
            return (
              <Stack key={item.label} gap={6}>
                <Group justify="space-between" gap="md" wrap="nowrap">
                  {status ? (
                    <StatusTag status={item.label} />
                  ) : (
                    <Text size="sm">{item.label}</Text>
                  )}
                  <Text size="sm" fw={700}>
                    {item.value.toLocaleString("vi-VN")}
                  </Text>
                </Group>
                <Progress value={percentage} color="blue" radius="xl" size={6} />
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

function AttendanceRateList({
  title,
  items,
  labelKey,
}: {
  title: string;
  items: Array<{
    unitName?: string;
    departmentName?: string;
    workDays: number;
    attendedDays: number;
    attendanceRate: number;
  }>;
  labelKey: "unitName" | "departmentName";
}) {
  return (
    <Paper p="md" radius="md">
      <Stack gap="sm">
        <Text fw={650}>{title}</Text>
        {items.length === 0 ? (
          <Text size="sm" c="dimmed">
            Chưa có dữ liệu công tháng này.
          </Text>
        ) : (
          items.slice(0, 6).map((item) => (
            <Group
              key={item[labelKey] ?? "unknown"}
              justify="space-between"
              gap="md"
            >
              <Stack gap={0}>
                <Text size="sm">{item[labelKey] ?? "-"}</Text>
                <Text size="xs" c="dimmed">
                  {item.attendedDays.toLocaleString("vi-VN")}/
                  {item.workDays.toLocaleString("vi-VN")} ngày
                </Text>
              </Stack>
              <Badge
                color={item.attendanceRate >= 95 ? "green" : "yellow"}
                variant="light"
              >
                {item.attendanceRate.toLocaleString("vi-VN")}%
              </Badge>
            </Group>
          ))
        )}
      </Stack>
    </Paper>
  );
}

function TopLateTable({
  items,
}: {
  items: Array<{
    employeeId: string;
    employeeCode?: string | null;
    fullName?: string | null;
    unitName?: string | null;
    departmentName?: string | null;
    lateCount: number;
    totalLateMinutes: number;
  }>;
}) {
  return (
    <Paper p="md" radius="md">
      <Stack gap="sm">
        <Text fw={650}>Nhân sự đi muộn nhiều nhất</Text>
        {items.length === 0 ? (
          <Text size="sm" c="dimmed">
            Chưa ghi nhận lần đi muộn trong tháng này.
          </Text>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nhân sự</Table.Th>
                <Table.Th>Đơn vị</Table.Th>
                <Table.Th ta="right">Lần</Table.Th>
                <Table.Th ta="right">Phút</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.employeeId}>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm" fw={600}>
                        {item.fullName ?? item.employeeId}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {item.employeeCode ?? "-"}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm">{item.unitName ?? "-"}</Text>
                      <Text size="xs" c="dimmed">
                        {item.departmentName ?? "-"}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td ta="right">
                    {item.lateCount.toLocaleString("vi-VN")}
                  </Table.Td>
                  <Table.Td ta="right">
                    {item.totalLateMinutes.toLocaleString("vi-VN")}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
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
      tone: "green",
    },
    {
      title: "Nhân sự mới",
      value: data.newHiresThisMonth,
      helper: "Tuyển mới trong tháng",
      icon: IconUserPlus,
      tone: "blue",
      onClick: () => navigate(`${ROUTES.employees}?quick=newHires`),
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
      onClick: () => navigate(ROUTES.leave),
    },
    {
      label: "Điều chuyển chờ xử lý",
      description: "Đề nghị điều chuyển đang chờ phê duyệt",
      count: data.pendingMovements,
      icon: IconArrowUpRight,
      onClick: () => navigate(ROUTES.movements),
    },
    {
      label: "Onboarding đang chạy",
      description: "Đợt hòa nhập nhân sự mới đang thực hiện",
      count: data.onboardingInProgress,
      icon: IconBriefcase,
      onClick: () => navigate(ROUTES.onboarding),
    },
    {
      label: "Offboarding đang chạy",
      description: "Đợt bàn giao nghỉ việc đang thực hiện",
      count: data.offboardingInProgress,
      icon: IconBriefcase,
      onClick: () => navigate(ROUTES.offboarding),
    },
    {
      label: "Giải trình chấm công chờ duyệt",
      description: "Yêu cầu giải trình chấm công đang chờ xử lý",
      count: data.pendingAttendanceExplanations,
      icon: IconCalendarTime,
      onClick: () => navigate(ROUTES.attendanceMapping),
    },
  ];
  const actionItems = allActionItems.filter((item) => item.count > 0);

  return (
    <>
      <PageHeader
        title="Tổng quan"
        subtitle="Theo dõi nhân sự, quy trình và các việc cần xử lý tại một nơi."
        actions={
          <Group gap="xs" wrap="wrap">
            <Group gap={6} className="dashboard-date-label" visibleFrom="sm">
              <IconCalendarTime size={15} />
              <Text size="sm" c="dimmed" tt="capitalize">
                {dateLabel}
              </Text>
            </Group>
            <Button variant="default" onClick={() => navigate(ROUTES.employees)}>
              Danh sách nhân sự
            </Button>
            <Button
              rightSection={<IconChevronRight size={16} />}
              onClick={() => navigate(ROUTES.attendance)}
            >
              Chấm công
            </Button>
          </Group>
        }
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">

          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </SimpleGrid>

        <Paper className="page-card" p="md" withBorder>
          <Stack gap={2} mb="md">
            <Text fw={700} size="sm">
              Việc cần xử lý
            </Text>
            <Text size="xs" c="dimmed">
              Tổng hợp các yêu cầu và quy trình đang chờ bạn
            </Text>
          </Stack>
          {actionItems.length ? (
            <Stack gap="xs">
              {actionItems.map((item, index) => (
                <div key={item.label}>
                  <ActionRow {...item} />
                  {index < actionItems.length - 1 ? <Divider my={4} /> : null}
                </div>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Không có yêu cầu nào đang chờ xử lý.
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

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <TopLateTable items={data.attendanceThisMonth.topLateEmployees} />
          <Paper p="md" radius="md">
            <Stack gap="sm">
              <Text fw={650}>Chuẩn bị bàn giao lương</Text>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Kỳ công đã chốt
                </Text>
                <Text size="sm" fw={650}>
                  {data.payrollHandoff.closedPeriods.toLocaleString("vi-VN")}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Kỳ mới nhất
                </Text>
                <Text size="sm" fw={650}>
                  {data.payrollHandoff.latestClosedPeriod
                    ? `${data.payrollHandoff.latestClosedPeriod.month}/${data.payrollHandoff.latestClosedPeriod.year}`
                    : "-"}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Định dạng lương
                </Text>
                <Badge color="yellow" variant="light">
                  Chờ chốt
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Phép năm đã dùng tháng này
                </Text>
                <Text size="sm" fw={650}>
                  {data.attendanceThisMonth.annualLeaveDaysUsed.toLocaleString(
                    "vi-VN",
                  )}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Quỹ phép
                </Text>
                <Badge color="yellow" variant="light">
                  Đang đối chiếu CSV
                </Badge>
              </Group>
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">
                    Phép sắp hết hạn
                  </Text>
                  <Text size="xs" c="dimmed">
                    {data.leaveExpiryRisks.message ??
                      "Đang chờ dữ liệu quỹ phép."}
                  </Text>
                </Stack>
                <Badge color="yellow" variant="light">
                  {data.leaveExpiryRisks.items.length.toLocaleString("vi-VN")}
                </Badge>
              </Group>
            </Stack>
          </Paper>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <AttendanceRateList
            title="Chuyên cần theo đơn vị"
            items={data.attendanceThisMonth.byUnit}
            labelKey="unitName"
          />
          <AttendanceRateList
            title="Chuyên cần theo phòng ban"
            items={data.attendanceThisMonth.byDepartment}
            labelKey="departmentName"
          />
        </SimpleGrid>
      </Stack>
    </>
  );
}
