import {
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";

import { useDashboardSummary } from "../features/dashboard/useDashboardSummary";
import { EmptyState } from "../shared/components/EmptyState";
import { ErrorState } from "../shared/components/ErrorState";
import { LoadingState } from "../shared/components/LoadingState";
import { PageHeader } from "../shared/components/PageHeader";

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Paper p="md" radius="md">
      <Stack gap={4}>
        <Text c="dimmed" size="sm">
          {title}
        </Text>
        <Title order={3}>{value.toLocaleString("vi-VN")}</Title>
      </Stack>
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
    <Paper p="md" radius="md">
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
    { title: "Tổng nhân sự", value: data.totalEmployees },
    { title: "Đang làm việc", value: data.activeEmployees },
    { title: "Tuyển mới tháng này", value: data.newHiresThisMonth },
    { title: "Nghỉ việc tháng này", value: data.terminatedThisMonth },
    { title: "Đơn nghỉ phép chờ duyệt", value: data.pendingLeaveRequests },
    {
      title: "Giải trình chấm công chờ duyệt",
      value: data.pendingAttendanceExplanations,
    },
    { title: "Điều chuyển chờ xử lý", value: data.pendingMovements },
    { title: "Onboarding đang chạy", value: data.onboardingInProgress },
    { title: "Offboarding đang chạy", value: data.offboardingInProgress },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Tổng quan vận hành HRM, chấm công, nghỉ phép và dữ liệu bàn giao lương."
      />

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
            />
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <BreakdownList title="Nhân sự theo đơn vị" items={data.employeesByUnit} />
          <BreakdownList
            title="Nhân sự theo trạng thái"
            items={data.employeesByEmploymentStatus}
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
