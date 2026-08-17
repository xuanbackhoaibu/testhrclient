import { Group, Paper, SimpleGrid, Stack, Table, Text } from "@mantine/core";

import { useDashboardSummary } from "../features/dashboard/useDashboardSummary";
import { EmptyState } from "../shared/components/EmptyState";
import { ErrorState } from "../shared/components/ErrorState";
import { LoadingState } from "../shared/components/LoadingState";
import { PageHeader } from "../shared/components/PageHeader";
import { getStatusLabel } from "../shared/constants/statusLabels";
import { BarChart } from "./dashboard/BarChart";
import { DonutChart, type ChartTone } from "./dashboard/DonutChart";
import styles from "./DashboardPage.module.css";

type Tone = ChartTone;

const formatCount = (value: number) => value.toLocaleString("vi-VN");

/** Status keys the API returns, mapped onto the validated status palette. */
const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: "good",
  PROBATION: "warning",
  INACTIVE: "unknown",
  SUSPENDED: "warning",
  RESIGNED: "warning",
  TERMINATED: "critical",
};

function MetricCard({
  title,
  value,
  tone = "accent",
}: {
  title: string;
  value: number;
  tone?: Tone;
}) {
  // A zero is "nothing to do" — it should recede, not compete with real counts.
  const quiet = value === 0;
  return (
    <div
      className={styles.tile}
      data-quiet={quiet ? "true" : undefined}
      style={
        quiet ? undefined : { ["--tile-accent" as string]: `var(--dash-${tone})` }
      }
    >
      <span className={styles.tileLabel}>
        <span className={styles.tileDot} aria-hidden="true" />
        {title}
      </span>
      <span className={styles.tileValue}>{formatCount(value)}</span>
    </div>
  );
}

/** Card chrome shared by every chart on the page: title, caption, plot. */
function ChartPanel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper p="md" radius="md" className={styles.panel}>
      <Stack gap="sm">
        <Group justify="space-between" align="baseline" gap="md">
          <span className={styles.sectionTitle}>{title}</span>
          {caption ? <span className={styles.sectionCaption}>{caption}</span> : null}
        </Group>
        {children}
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
    <Paper p="md" radius="md" className={styles.panel}>
      <Stack gap="sm">
        <span className={styles.sectionTitle}>{title}</span>
        {items.length === 0 ? (
          <Text size="sm" c="dimmed">
            Chưa có dữ liệu công tháng này.
          </Text>
        ) : (
          <Stack gap="xs">
            {items.slice(0, 6).map((item) => {
              const good = item.attendanceRate >= 95;
              return (
                <div key={item[labelKey] ?? "unknown"} className={styles.rankRow}>
                  <span className={styles.rankLabel} title={item[labelKey] ?? "-"}>
                    {item[labelKey] ?? "-"}
                  </span>
                  <span className={styles.rankValue}>
                    {item.attendanceRate.toLocaleString("vi-VN")}%
                  </span>
                  <span className={styles.rankTrack}>
                    <span
                      className={styles.meterFill}
                      data-tone={good ? "good" : "warning"}
                      style={{
                        width: `${Math.min(Math.max(item.attendanceRate, 0), 100)}%`,
                      }}
                    />
                  </span>
                  <Text size="xs" c="dimmed" style={{ gridColumn: "1 / -1" }}>
                    {formatCount(item.attendedDays)}/{formatCount(item.workDays)} ngày
                  </Text>
                </div>
              );
            })}
          </Stack>
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
    <Paper p="md" radius="md" className={styles.panel}>
      <Stack gap="sm">
        <Group justify="space-between" align="baseline" gap="md">
          <span className={styles.sectionTitle}>Nhân sự đi muộn nhiều nhất</span>
          <span className={styles.sectionCaption}>Tháng này</span>
        </Group>
        {items.length === 0 ? (
          <Text size="sm" c="dimmed">
            Chưa ghi nhận lần đi muộn trong tháng này.
          </Text>
        ) : (
          <Table highlightOnHover verticalSpacing="sm" withRowBorders={false}>
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
                  {/* Số lần là thông tin chính, số phút là phụ. */}
                  <Table.Td ta="right" fw={600}>
                    {formatCount(item.lateCount)}
                  </Table.Td>
                  <Table.Td ta="right" c="dimmed">
                    {formatCount(item.totalLateMinutes)}
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

  const unitTotal = data.employeesByUnit.reduce((sum, item) => sum + item.value, 0);
  const statusTotal = data.employeesByEmploymentStatus.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  // Headcount facts read neutral; queues that need action carry a status tone.
  const headcount: Array<{ title: string; value: number; tone?: Tone }> = [
    { title: "Tổng nhân sự", value: data.totalEmployees },
    { title: "Đang làm việc", value: data.activeEmployees, tone: "good" },
    { title: "Tuyển mới tháng này", value: data.newHiresThisMonth, tone: "good" },
    { title: "Nghỉ việc tháng này", value: data.terminatedThisMonth, tone: "critical" },
  ];

  const queues: Array<{ title: string; value: number; tone?: Tone }> = [
    { title: "Đơn nghỉ phép chờ duyệt", value: data.pendingLeaveRequests, tone: "warning" },
    {
      title: "Giải trình chấm công chờ duyệt",
      value: data.pendingAttendanceExplanations,
      tone: "warning",
    },
    { title: "Điều chuyển chờ xử lý", value: data.pendingMovements, tone: "warning" },
    { title: "Onboarding đang chạy", value: data.onboardingInProgress },
    { title: "Offboarding đang chạy", value: data.offboardingInProgress },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        subtitle="Tổng quan vận hành HRM, chấm công, nghỉ phép và dữ liệu bàn giao lương."
      />

      <Stack gap="lg">
        <Stack gap="xs">
          <span className={styles.sectionTitle}>Nhân sự</span>
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
            {headcount.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </SimpleGrid>
        </Stack>

        <Stack gap="xs">
          <span className={styles.sectionTitle}>Hàng chờ xử lý</span>
          <SimpleGrid cols={{ base: 2, md: 5 }} spacing="sm">
            {queues.map((metric) => (
              <MetricCard key={metric.title} {...metric} />
            ))}
          </SimpleGrid>
        </Stack>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" style={{ alignItems: "start" }}>
          <ChartPanel
            title="Nhân sự theo đơn vị"
            caption={`${formatCount(unitTotal)} nhân sự`}
          >
            {/* Long unit names rank better horizontally than as columns. */}
            <BarChart
              items={data.employeesByUnit.map((item) => ({
                key: item.label,
                label: item.label,
                value: item.value,
              }))}
            />
          </ChartPanel>

          <ChartPanel
            title="Nhân sự theo trạng thái"
            caption={`${formatCount(statusTotal)} nhân sự`}
          >
            {/* Few slices and a genuine part-to-whole: a donut earns its place. */}
            <DonutChart
              centerLabel="Tổng nhân sự"
              slices={data.employeesByEmploymentStatus.map((item) => ({
                key: item.label,
                label: getStatusLabel(item.label),
                value: item.value,
                tone: STATUS_TONES[item.label] ?? "accent",
              }))}
            />
          </ChartPanel>
        </SimpleGrid>

        <TopLateTable items={data.attendanceThisMonth.topLateEmployees} />

        {/* Top-aligned: the two lists rarely have the same row count, and a
            stretched short panel leaves a large void under its last row. */}
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" style={{ alignItems: "start" }}>
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
    </div>
  );
}
