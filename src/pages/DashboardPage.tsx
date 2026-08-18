import { Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

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

// Ngưỡng chuyên cần coi là đạt, dùng chung cho màu thanh và vạch mục tiêu.
const ATTENDANCE_TARGET = 95;

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
  const visible = items.slice(0, 6);

  // Tỉ lệ chuyên cần luôn dồn ở vùng cao (90-100%), nên vẽ từ 0% khiến mọi
  // phòng ban trông bằng nhau. Cắt trục ở dưới giá trị thấp nhất để phần chênh
  // lệch thật sự nhìn thấy được, và neo đáy trục theo bội số 5 cho dễ đọc.
  const lowest = Math.min(...visible.map((item) => item.attendanceRate), ATTENDANCE_TARGET);
  const axisMin = Math.max(0, Math.floor((lowest - 2) / 5) * 5);
  const axisSpan = Math.max(1, 100 - axisMin);
  const toPercent = (value: number) =>
    Math.min(Math.max(((value - axisMin) / axisSpan) * 100, 0), 100);

  return (
    <Paper p="md" radius="md" className={styles.panel}>
      <Stack gap="sm">
        <Group justify="space-between" align="baseline" gap="md">
          <span className={styles.sectionTitle}>{title}</span>
          <span className={styles.sectionCaption}>Mục tiêu {ATTENDANCE_TARGET}%</span>
        </Group>
        {visible.length === 0 ? (
          <Text size="sm" c="dimmed">
            Chưa có dữ liệu công tháng này.
          </Text>
        ) : (
          <Stack gap="xs">
            {visible.map((item) => {
              const good = item.attendanceRate >= ATTENDANCE_TARGET;
              return (
                <div key={item[labelKey] ?? "unknown"} className={styles.rankRow}>
                  <span className={styles.rankLabel} title={item[labelKey] ?? "-"}>
                    {item[labelKey] ?? "-"}
                  </span>
                  <span className={styles.rankValue}>
                    {item.attendanceRate.toLocaleString("vi-VN")}%
                  </span>
                  <span
                    className={styles.meterTrack}
                    style={{ gridColumn: "1 / -1" }}
                    role="img"
                    aria-label={`${item[labelKey] ?? "Không rõ"}: ${item.attendanceRate.toLocaleString("vi-VN")}%, mục tiêu ${ATTENDANCE_TARGET}%`}
                  >
                    <span
                      className={styles.targetMark}
                      style={{ left: `${toPercent(ATTENDANCE_TARGET)}%` }}
                    />
                    <span
                      className={styles.meterFill}
                      data-tone={good ? "good" : "warning"}
                      style={{ width: `${toPercent(item.attendanceRate)}%` }}
                    />
                  </span>
                  <Text size="xs" c="dimmed" style={{ gridColumn: "1 / -1" }}>
                    {formatCount(item.attendedDays)}/{formatCount(item.workDays)} ngày
                  </Text>
                </div>
              );
            })}
            <Group justify="space-between" gap="xs">
              <Text size="xs" c="dimmed">
                {axisMin}%
              </Text>
              <Text size="xs" c="dimmed">
                100%
              </Text>
            </Group>
          </Stack>
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
