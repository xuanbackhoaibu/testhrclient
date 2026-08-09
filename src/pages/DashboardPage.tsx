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
            Chua co du lieu cong thang nay.
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
                  {item.workDays.toLocaleString("vi-VN")} ngay
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
        <Text fw={650}>Nhan su di muon nhieu nhat</Text>
        {items.length === 0 ? (
          <Text size="sm" c="dimmed">
            Chua ghi nhan lan di muon trong thang nay.
          </Text>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nhan su</Table.Th>
                <Table.Th>Don vi</Table.Th>
                <Table.Th ta="right">Lan</Table.Th>
                <Table.Th ta="right">Phut</Table.Th>
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
    { title: "Tong nhan su", value: data.totalEmployees },
    { title: "Dang lam viec", value: data.activeEmployees },
    { title: "Tuyen moi thang nay", value: data.newHiresThisMonth },
    { title: "Nghi viec thang nay", value: data.terminatedThisMonth },
    { title: "Don nghi phep cho duyet", value: data.pendingLeaveRequests },
    {
      title: "Giai trinh cham cong cho duyet",
      value: data.pendingAttendanceExplanations,
    },
    { title: "Dieu chuyen cho xu ly", value: data.pendingMovements },
    { title: "Onboarding dang chay", value: data.onboardingInProgress },
    { title: "Offboarding dang chay", value: data.offboardingInProgress },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Tong quan van hanh HRM, cham cong, nghi phep va du lieu ban giao luong."
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
          <BreakdownList title="Nhan su theo don vi" items={data.employeesByUnit} />
          <BreakdownList
            title="Nhan su theo trang thai"
            items={data.employeesByEmploymentStatus}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <TopLateTable items={data.attendanceThisMonth.topLateEmployees} />
          <Paper p="md" radius="md">
            <Stack gap="sm">
              <Text fw={650}>Chuan bi ban giao luong</Text>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Ky cong da chot
                </Text>
                <Text size="sm" fw={650}>
                  {data.payrollHandoff.closedPeriods.toLocaleString("vi-VN")}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Ky moi nhat
                </Text>
                <Text size="sm" fw={650}>
                  {data.payrollHandoff.latestClosedPeriod
                    ? `${data.payrollHandoff.latestClosedPeriod.month}/${data.payrollHandoff.latestClosedPeriod.year}`
                    : "-"}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Dinh dang luong
                </Text>
                <Badge color="yellow" variant="light">
                  Cho chot
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Phep nam da dung thang nay
                </Text>
                <Text size="sm" fw={650}>
                  {data.attendanceThisMonth.annualLeaveDaysUsed.toLocaleString(
                    "vi-VN",
                  )}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Quy phep
                </Text>
                <Badge color="yellow" variant="light">
                  Dang doi chieu CSV
                </Badge>
              </Group>
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">
                    Phep sap het han
                  </Text>
                  <Text size="xs" c="dimmed">
                    {data.leaveExpiryRisks.message ??
                      "Dang cho du lieu quy phep."}
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
            title="Chuyen can theo don vi"
            items={data.attendanceThisMonth.byUnit}
            labelKey="unitName"
          />
          <AttendanceRateList
            title="Chuyen can theo phong ban"
            items={data.attendanceThisMonth.byDepartment}
            labelKey="departmentName"
          />
        </SimpleGrid>
      </Stack>
    </>
  );
}
