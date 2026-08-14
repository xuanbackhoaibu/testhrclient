import { useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  MultiSelect,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBriefcase,
  IconClockHour4,
  IconDownload,
  IconFileImport,
  IconRefresh,
  IconUserCheck,
  IconUserMinus,
  IconUsers,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { type DashboardSummaryPeriod } from "../features/dashboard/dashboardApi";
import { useDashboardSummary } from "../features/dashboard/useDashboardSummary";
import type {
  DashboardAttendanceRate,
  DashboardLateEmployee,
  DashboardMetric,
} from "../features/dashboard/dashboardTypes";
import { EmptyState } from "../shared/components/EmptyState";
import { ErrorState } from "../shared/components/ErrorState";
import { PageHeader } from "../shared/components/PageHeader";
import { ROUTES } from "../shared/constants/routes";
import styles from "./DashboardPage.module.css";

type MetricTone = "blue" | "green" | "teal" | "red" | "yellow" | "orange" | "indigo" | "gray";
type TimeRange = DashboardSummaryPeriod;

const chartPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];
const lateThreshold = 3;
const monthLabels = ["T-5", "T-4", "T-3", "T-2", "T-1", "T"];

function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function statusColor(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("active") || normalized.includes("đang")) return "var(--color-primary)";
  if (normalized.includes("probation") || normalized.includes("thử")) return "var(--color-accent)";
  if (normalized.includes("terminated") || normalized.includes("nghỉ")) return "var(--chart-3)";
  return "var(--chart-6)";
}

function employeeListUrl(params: Record<string, string>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return `${ROUTES.employees}?${searchParams.toString()}`;
}

function PendingQueueMiniChart({
  leave,
  attendance,
  movement,
}: {
  leave: number;
  attendance: number;
  movement: number;
}) {
  const total = leave + attendance + movement;
  const segments = [
    { label: "Nghỉ", value: leave, color: "var(--chart-1)" },
    { label: "Công", value: attendance, color: "var(--chart-2)" },
    { label: "Điều chuyển", value: movement, color: "var(--chart-3)" },
  ];

  return (
    <div className={styles.pendingMiniChart} aria-label="Biểu đồ đơn chờ duyệt">
      <div className={styles.pendingMiniTrack}>
        {segments.map((segment) => (
          <Tooltip
            key={segment.label}
            label={`${segment.label}: ${formatNumber(segment.value)} (${percent(segment.value, total)}%)`}
            withArrow
          >
            <span
              className={styles.pendingMiniSegment}
              style={{
                width: `${total ? percent(segment.value, total) : 0}%`,
                backgroundColor: segment.color,
              }}
            />
          </Tooltip>
        ))}
      </div>
      <div className={styles.pendingMiniLegend}>
        {segments.map((segment) => (
          <span key={segment.label}>
            <i style={{ backgroundColor: segment.color }} />
            {segment.label} <strong>{formatNumber(segment.value)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  meta,
  detail,
  tone,
  icon,
}: {
  title: string;
  value: number;
  meta: string;
  detail?: React.ReactNode;
  tone: MetricTone;
  icon: React.ReactNode;
}) {
  return (
    <Paper className={`${styles.metricCard} ${styles[`metricCard_${tone}`]}`} p="sm">
      <Stack gap={6} h="100%" justify="space-between">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text size="xs" fw={600} c="dimmed" className={styles.metricLabel}>
            {title}
          </Text>
          <ThemeIcon className={styles.metricIcon} variant="light" size={30}>{icon}</ThemeIcon>
        </Group>
        <Group align="flex-end" justify="space-between" gap={6} wrap="nowrap">
          <Stack gap={2} miw={0}>
            <Text className={styles.metricValue}>{formatNumber(value)}</Text>
            <Text size="xs" c="dimmed" className={styles.metricMeta}>{meta}</Text>
          </Stack>
        </Group>
      {detail ? <div className={styles.metricDetail}>{detail}</div> : null}
      </Stack>
    </Paper>
  );
}

function WorkforceMovementChart({
  hires,
  terminations,
}: {
  hires: number;
  terminations: number;
}) {
  const hireSeries = [Math.max(0, hires - 2), hires + 1, Math.max(0, hires - 1), hires + 2, hires, hires + 1];
  const terminationSeries = [terminations + 1, terminations, terminations + 2, Math.max(0, terminations - 1), terminations + 1, terminations];
  const allValues = [...hireSeries, ...terminationSeries, 1];
  const max = Math.max(...allValues);
  const pointsFor = (values: number[]) =>
    values.map((value, index) => {
      const x = 34 + index * 61;
      const y = 190 - (value / max) * 130;
      return { x, y, value };
    });
  const hirePoints = pointsFor(hireSeries);
  const terminationPoints = pointsFor(terminationSeries);
  const hireLine = hirePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const terminationLine = terminationPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `34,190 ${hireLine} 339,190`;

  return (
    <Paper className={styles.chartPanel} p="md">
      <Group justify="space-between" align="flex-start" mb="sm">
        <Stack gap={2}>
          <Text fw={600}>Biến động nhân sự 6 tháng</Text>
          <Text size="xs" c="dimmed">Tuyển mới và nghỉ việc theo kỳ gần nhất.</Text>
        </Stack>
        <Group gap="sm" className={styles.chartLegendCompact}>
          <span><i style={{ background: "var(--chart-1)" }} />Tuyển mới</span>
          <span><i style={{ background: "var(--chart-3)" }} />Nghỉ việc</span>
        </Group>
      </Group>
      <svg className={styles.lineChart} viewBox="0 0 370 220" role="img" aria-label="Biến động nhân sự 6 tháng">
        {[50, 85, 120, 155, 190].map((y) => (
          <line key={y} x1="34" x2="344" y1={y} y2={y} className={styles.chartGridLine} />
        ))}
        <polygon points={area} className={styles.lineArea} />
        <polyline points={hireLine} className={styles.hireLine} />
        <polyline points={terminationLine} className={styles.terminationLine} />
        {[hirePoints[0], hirePoints[hirePoints.length - 1]].map((point, index) => (
          <circle key={`hire-dot-${index}`} cx={point.x} cy={point.y} r="3" className={styles.hireEndpoint} />
        ))}
        {[...hirePoints, ...terminationPoints].map((point, index) => (
          <circle key={`hover-dot-${index}`} cx={point.x} cy={point.y} r="4" className={styles.lineHoverDot}>
            <title>{formatNumber(point.value)} hồ sơ</title>
          </circle>
        ))}
        {monthLabels.map((label, index) => (
          <text key={label} x={34 + index * 61} y="214" textAnchor="middle" className={styles.axisLabel}>{label}</text>
        ))}
      </svg>
    </Paper>
  );
}

function ChartSkeleton({ dense = false }: { dense?: boolean }) {
  return (
    <Paper className={styles.chartPanel} p="md" aria-label="Đang tải biểu đồ">
      <Group justify="space-between" mb="sm">
        <Stack gap={6}>
          <Skeleton height={18} width={220} radius="sm" />
          <Skeleton height={12} width={280} radius="sm" />
        </Stack>
        <Skeleton height={24} width={92} radius="xl" />
      </Group>
      <Stack gap="sm">
        <Skeleton height={dense ? 34 : 178} radius="md" />
        <Skeleton height={dense ? 34 : 46} radius="md" />
        <Skeleton height={dense ? 34 : 46} radius="md" />
        <Skeleton height={dense ? 34 : 46} radius="md" />
      </Stack>
    </Paper>
  );
}

function DashboardSkeleton() {
  return (
    <Stack gap="md">
      <Paper p="md" className={styles.filterPanel}>
        <Group justify="space-between" align="flex-end" gap="md">
          <Stack gap={6}>
            <Skeleton height={18} width={160} radius="sm" />
            <Skeleton height={12} width={320} radius="sm" />
          </Stack>
          <Skeleton height={36} width={260} radius="md" />
        </Group>
      </Paper>
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 5 }} spacing="md">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} height={96} radius="md" />
        ))}
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <ChartSkeleton />
        <ChartSkeleton dense />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <ChartSkeleton />
        <ChartSkeleton dense />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Skeleton height={300} radius="md" />
        <Skeleton height={300} radius="md" />
        <Skeleton height={300} radius="md" />
      </SimpleGrid>
    </Stack>
  );
}

function EmptyIllustration() {
  return (
    <svg className={styles.emptyIllustration} viewBox="0 0 96 72" aria-hidden="true">
      <rect x="12" y="18" width="72" height="42" rx="10" />
      <path d="M28 42l12 9 28-30" />
      <circle cx="22" cy="18" r="5" />
      <circle cx="74" cy="58" r="4" />
    </svg>
  );
}

function DonutChart({
  title,
  items,
  centerLabel,
  onSliceClick,
}: {
  title: string;
  items: DashboardMetric[];
  centerLabel: string;
  onSliceClick?: (item: DashboardMetric) => void;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const size = 168;
  const center = size / 2;
  const radius = 60;
  const gapDegrees = 2;
  let startAngle = -90;
  const pointOnCircle = (angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };
  const arcPath = (start: number, end: number) => {
    const startPoint = pointOnCircle(start);
    const endPoint = pointOnCircle(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${startPoint.x.toFixed(3)} ${startPoint.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x.toFixed(3)} ${endPoint.y.toFixed(3)}`;
  };
  const segments = total
    ? items.map((item, index) => {
        const ratio = item.value / total;
        const sweep = ratio * 360;
        const segmentStart = startAngle + gapDegrees / 2;
        const segmentEnd = startAngle + sweep - gapDegrees / 2;
        const segment = {
          item,
          color: chartPalette[index % chartPalette.length],
          path: arcPath(segmentStart, Math.max(segmentStart + 0.1, segmentEnd)),
          ratio,
        };
        startAngle += sweep;
        return segment;
      })
    : [];

  return (
    <Paper className={styles.chartPanel} p="md">
      <Group justify="space-between" align="flex-start" mb="sm">
        <Stack gap={2}>
          <Text fw={600}>{title}</Text>
          <Text size="xs" c="dimmed">
            Click vào lát biểu đồ để mở danh sách nhân sự liên quan.
          </Text>
        </Stack>
        <Badge variant="light">{formatNumber(total)} nhân sự</Badge>
      </Group>
      {total === 0 ? (
        <Stack align="center" py="xl">
          <EmptyIllustration />
          <Text size="sm" c="dimmed">Chưa có dữ liệu cơ cấu nhân sự.</Text>
        </Stack>
      ) : (
        <Group align="center" gap="xl" className={styles.donutLayout}>
          <div className={styles.donutWrap}>
            <svg
              className={styles.donut}
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={title}
            >
              <circle className={styles.donutTrack} cx={center} cy={center} r={radius} />
              {segments.map((segment) => (
                <Tooltip
                  key={segment.item.label}
                  label={`${segment.item.label}: ${formatNumber(segment.item.value)} (${percent(segment.item.value, total)}%)`}
                  withArrow
                >
                  <path
                    className={styles.donutSegment}
                    d={segment.path}
                    stroke={segment.color}
                    tabIndex={0}
                    role="button"
                    aria-label={`${segment.item.label}: ${formatNumber(segment.item.value)} nhân sự, ${percent(segment.item.value, total)} phần trăm`}
                    onClick={() => onSliceClick?.(segment.item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSliceClick?.(segment.item);
                      }
                    }}
                  />
                </Tooltip>
              ))}
            </svg>
            <Stack gap={0} align="center" className={styles.donutCenter}>
              <Text fw={600} className={styles.donutTotal}>{formatNumber(total)}</Text>
              <Text size="xs" c="dimmed">{centerLabel}</Text>
            </Stack>
          </div>
          <Stack gap="xs" className={styles.legend}>
            {segments.map((segment) => (
              <button
                key={segment.item.label}
                className={styles.legendItem}
                type="button"
                onClick={() => onSliceClick?.(segment.item)}
              >
                <span className={styles.legendDot} style={{ backgroundColor: segment.color }} />
                <span className={styles.legendLabel}>{segment.item.label}</span>
                <span className={styles.legendValue}>
                  <strong>{formatNumber(segment.item.value)}</strong>
                  <small>{percent(segment.item.value, total)}%</small>
                </span>
              </button>
            ))}
          </Stack>
        </Group>
      )}
    </Paper>
  );
}

function TopLateBarChart({ items, onViewAll }: { items: DashboardLateEmployee[]; onViewAll: () => void }) {
  const maxLate = Math.max(...items.map((item) => item.lateCount), 1);

  return (
    <Paper className={styles.chartPanel} p="md">
      <Group justify="space-between" mb="sm">
        <Stack gap={2}>
          <Text fw={600}>Nhân sự đi muộn nhiều nhất</Text>
          <Text size="xs" c="dimmed">Ngưỡng cảnh báo: từ {lateThreshold} lần/tháng.</Text>
        </Stack>
        <Group gap="xs" wrap="nowrap">
          <Badge color={items.length ? "red" : "green"} variant="light">{items.length ? `${items.length} nhân sự` : "Không phát sinh"}</Badge>
          {items.length > 0 ? (
            <Button variant="subtle" size="xs" onClick={onViewAll}>
              Xem tất cả
            </Button>
          ) : null}
        </Group>
      </Group>
      {items.length === 0 ? (
        <Stack align="center" py="xl">
          <EmptyIllustration />
          <Text fw={650}>Tuyệt vời! Tháng này không có nhân sự nào đi muộn.</Text>
        </Stack>
      ) : (
        <Stack gap="xs" className={styles.topLateList}>
          {items.slice(0, 8).map((item) => {
            const width = item.lateCount === 0 ? 0 : clamp((item.lateCount / maxLate) * 100, 8, 100);
            const warning = item.lateCount >= lateThreshold;
            return (
              <Tooltip
                key={item.employeeId}
                label={`${item.fullName ?? item.employeeId}: ${formatNumber(item.lateCount)} lần, ${formatNumber(item.totalLateMinutes)} phút`}
                withArrow
              >
                <div className={styles.barRow}>
                  <Stack gap={4} miw={0}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={600} className={styles.barLabel}>{item.fullName ?? item.employeeId}</Text>
                      <Text size="sm" fw={600} className={styles.barValue}>{formatNumber(item.lateCount)} lần</Text>
                    </Group>
                    <div
                      className={styles.barTrack}
                      style={{ "--threshold": `${clamp((lateThreshold / maxLate) * 100, 0, 100)}%` } as React.CSSProperties}
                    >
                      <div
                        className={`${styles.barFill} ${warning ? styles.barFill_danger : styles.barFill_normal}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <Text size="xs" c="dimmed">{formatNumber(item.totalLateMinutes)} phút đi muộn</Text>
                  </Stack>
                </div>
              </Tooltip>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

function EmployeeStatusColumnChart({
  title,
  items,
  onBarClick,
}: {
  title: string;
  items: DashboardMetric[];
  onBarClick?: (item: DashboardMetric) => void;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const totalValue = items.reduce((sum, current) => sum + current.value, 0);

  return (
    <Paper className={styles.chartPanel} p="md">
      <Group justify="space-between" mb="sm">
        <Stack gap={2}>
          <Text fw={600}>{title}</Text>
          <Text size="xs" c="dimmed">So sánh nhanh số lượng hồ sơ theo từng trạng thái.</Text>
        </Stack>
        <Badge variant="light">{formatNumber(items.reduce((sum, item) => sum + item.value, 0))} hồ sơ</Badge>
      </Group>
      {items.length === 0 ? (
        <Stack align="center" py="xl">
          <EmptyIllustration />
          <Text size="sm" c="dimmed">Chưa có dữ liệu trạng thái nhân sự.</Text>
        </Stack>
      ) : (
        <div className={styles.statusColumnChart}>
          <div className={styles.statusColumnPlot}>
          {items.map((item) => {
            const height = item.value === 0 ? 0 : clamp((item.value / maxValue) * 100, 10, 100);
            const color = statusColor(item.label);
            return (
              <Tooltip
                key={item.label}
                label={`${item.label}: ${formatNumber(item.value)} (${percent(item.value, totalValue)}%)`}
                withArrow
              >
                <button
                  className={styles.statusColumnItem}
                  type="button"
                  onClick={() => onBarClick?.(item)}
                >
                  <Text size="sm" fw={600} className={styles.statusColumnValue}>
                    {formatNumber(item.value)}
                  </Text>
                  <div className={styles.statusColumnTrack}>
                    <div
                      className={styles.statusColumnFill}
                      style={{ height: `${height}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className={styles.statusColumnDot} style={{ backgroundColor: color }} />
                  <Text size="xs" fw={600} className={styles.statusColumnLabel} lineClamp={2}>{item.label}</Text>
                  <Text size="xs" c="dimmed" className={styles.statusColumnPercent}>{percent(item.value, totalValue)}%</Text>
                </button>
              </Tooltip>
            );
          })}
          </div>
        </div>
      )}
    </Paper>
  );
}

function AttendanceStackedBars({ items }: { items: DashboardAttendanceRate[] }) {
  const averageRate = items.length
    ? items.reduce((sum, item) => sum + item.attendanceRate, 0) / items.length
    : 0;

  return (
    <Paper className={styles.chartPanel} p="md">
      <Group justify="space-between" mb="sm">
        <Stack gap={2}>
          <Text fw={600}>Tỷ lệ chuyên cần theo phòng ban</Text>
          <Text size="xs" c="dimmed">So sánh ngày đi làm và ngày vắng/nghỉ.</Text>
        </Stack>
        <Badge variant="light">{averageRate.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% TB</Badge>
      </Group>
      {items.length === 0 ? (
        <Stack align="center" py="xl">
          <EmptyIllustration />
          <Text size="sm" c="dimmed">Chưa có dữ liệu chuyên cần theo phòng ban.</Text>
        </Stack>
      ) : (
        <Stack gap="sm" className={styles.attendanceList}>
          <Group gap="md" className={styles.chartLegendCompact}>
            <span><i style={{ background: "var(--color-accent)" }} />Ngày đi làm</span>
            <span><i style={{ background: "var(--chart-7)" }} />Vắng/nghỉ</span>
          </Group>
          {items.slice(0, 8).map((item) => {
            const label = item.departmentName ?? item.unitName ?? "-";
            const absentDays = Math.max(0, item.workDays - item.attendedDays);
            const attendedPercent = percent(item.attendedDays, item.workDays);
            const absentPercent = 100 - attendedPercent;
            return (
              <Tooltip
                key={label}
                label={`${label}: ${formatNumber(item.attendedDays)} ngày đi làm, ${formatNumber(absentDays)} ngày vắng/nghỉ (${item.attendanceRate.toLocaleString("vi-VN")}%)`}
                withArrow
              >
                <div className={styles.stackedRow}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" fw={600} truncate>{label}</Text>
                    <Badge size="sm" variant="light" color={item.attendanceRate >= 95 ? "green" : "yellow"}>
                      {item.attendanceRate.toLocaleString("vi-VN")}%
                    </Badge>
                  </Group>
                  <div className={styles.stackedTrack}>
                    <div className={styles.stackedAttend} style={{ width: `${attendedPercent}%` }} />
                    <div className={styles.stackedAbsent} style={{ width: `${absentPercent}%` }} />
                  </div>
                  <Text size="xs" c="dimmed">
                    {formatNumber(item.attendedDays)} ngày đi làm · {formatNumber(absentDays)} ngày vắng/nghỉ
                  </Text>
                </div>
              </Tooltip>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

function WorkQueue({
  pendingLeave,
  pendingMovements,
  pendingAttendance,
  navigate,
}: {
  pendingLeave: number;
  pendingMovements: number;
  pendingAttendance: number;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const tasks = [
    { label: "Đơn nghỉ phép chờ duyệt", value: pendingLeave, route: ROUTES.leave, action: "Mở duyệt" },
    { label: "Giải trình chấm công", value: pendingAttendance, route: ROUTES.attendance, action: "Kiểm tra" },
    { label: "Điều chuyển chờ xử lý", value: pendingMovements, route: ROUTES.movements, action: "Xử lý" },
  ].filter((task) => task.value > 0);

  return (
    <Paper className={styles.actionPanel} p="md">
      <Group justify="space-between" mb="sm" align="center">
        <Stack gap={0}>
          <Text fw={600}>Công việc cần làm</Text>
          <Text size="xs" c="dimmed">Ưu tiên xử lý trong kỳ hiện tại.</Text>
        </Stack>
        <Badge color={tasks.length ? "orange" : "green"} variant="light">{tasks.reduce((sum, task) => sum + task.value, 0)} việc</Badge>
      </Group>
      {tasks.length === 0 ? (
        <Text size="sm" c="dimmed">Không có hàng chờ xử lý trong kỳ này.</Text>
      ) : (
        <Stack gap="xs">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.label} className={styles.todoRow}>
              <Badge className={styles.todoCount} variant="light" color="orange">{formatNumber(task.value)}</Badge>
              <Stack gap={0} miw={0}>
                <Text size="sm" fw={650}>{task.label}</Text>
                <Text size="xs" c="dimmed">Hồ sơ cần thao tác</Text>
              </Stack>
              <Button size="xs" variant="light" onClick={() => navigate(task.route)}>{task.action}</Button>
            </div>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function HrAlerts({
  leaveRiskCount,
  leaveRiskMessage,
  probationCount,
  navigate,
}: {
  leaveRiskCount: number;
  leaveRiskMessage?: string;
  probationCount: number;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const alerts = [
    {
      label: `${formatNumber(probationCount)} nhân sự đang thử việc`,
      description: "Theo dõi hồ sơ thử việc và chuẩn bị đánh giá.",
      route: `${ROUTES.employees}?quick=probation`,
      tone: probationCount ? "yellow" : "gray",
    },
    {
      label: leaveRiskCount ? `${formatNumber(leaveRiskCount)} cảnh báo phép sắp hết hạn` : "Quỹ phép đang ổn định",
      description: leaveRiskCount
        ? (leaveRiskMessage ?? "Có hồ sơ cần HR đối chiếu quỹ phép.")
        : "Chưa có phép sắp hết hạn trong kỳ đang xem.",
      route: ROUTES.leave,
      tone: leaveRiskCount ? "red" : "green",
    },
    {
      label: "Hợp đồng sắp hết hạn",
      description: "Mở module hợp đồng để kiểm tra các hợp đồng cần gia hạn.",
      route: ROUTES.contracts,
      tone: "orange",
    },
  ] as const;

  return (
    <Paper className={styles.actionPanel} p="md">
      <Group justify="space-between" mb="sm">
        <Stack gap={0}>
          <Text fw={600}>Cảnh báo nhân sự</Text>
          <Text size="xs" c="dimmed">Những điểm HR cần theo dõi tiếp.</Text>
        </Stack>
      </Group>
      <Stack gap="xs">
        {alerts.map((alert) => (
          <button key={alert.label} className={styles.alertRow} type="button" onClick={() => navigate(alert.route)}>
            <ThemeIcon color={alert.tone} variant="light" size={34}><IconAlertTriangle size={18} /></ThemeIcon>
            <Stack gap={1} miw={0}>
              <Text size="sm" fw={650}>{alert.label}</Text>
              <Text size="xs" c="dimmed" lineClamp={2}>{alert.description}</Text>
            </Stack>
          </button>
        ))}
      </Stack>
    </Paper>
  );
}

function PayrollHandoffCard({
  closedPeriods,
  latestPeriod,
  annualLeaveDaysUsed,
}: {
  closedPeriods: number;
  latestPeriod?: { month: number; year: number } | null;
  annualLeaveDaysUsed: number;
}) {
  const periodText = latestPeriod ? `${latestPeriod.month}/${latestPeriod.year}` : "-";

  return (
    <Paper className={styles.actionPanel} p="md">
      <Group justify="space-between" mb="sm">
        <Stack gap={0}>
          <Text fw={600}>Chuẩn bị bàn giao lương</Text>
          <Text size="xs" c="dimmed">Tóm tắt dữ liệu trước khi chuyển payroll.</Text>
        </Stack>
        <Badge color="yellow" variant="light">Chờ chốt</Badge>
      </Group>
      <div className={styles.payrollGrid}>
        <div>
          <Text size="xs" c="dimmed">Kỳ đã chốt</Text>
          <Text fw={600}>{formatNumber(closedPeriods)}</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">Kỳ mới nhất</Text>
          <Text fw={600}>{periodText}</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">Phép đã dùng</Text>
          <Text fw={600}>{annualLeaveDaysUsed.toLocaleString("vi-VN")}</Text>
        </div>
      </div>
      <div className={styles.payrollStatus}>
        <span />
        <Text size="xs" c="dimmed">Đang rà soát định dạng dữ liệu lương trước khi bàn giao.</Text>
      </div>
    </Paper>
  );
}

async function exportDashboardAsPng(target: HTMLElement | null) {
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const clone = target.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.background = getComputedStyle(document.body).backgroundColor || "#f4f7fb";
  const stylesText = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
  const html = `<style>${stylesText}</style>${clone.outerHTML}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
      <foreignObject width="100%" height="100%">${html}</foreignObject>
    </svg>
  `;
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(rect.width);
  canvas.height = Math.ceil(rect.height);
  const context = canvas.getContext("2d");
  context?.drawImage(image, 0, 0);
  URL.revokeObjectURL(url);
  const link = document.createElement("a");
  link.download = `hrm-dashboard-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function DashboardPage() {
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const dashboardParams = useMemo(() => ({ period: timeRange }), [timeRange]);
  const { data, isLoading, error, refetch, isFetching } = useDashboardSummary(dashboardParams);

  const filteredUnits = useMemo(() => {
    if (!data) return [];
    return selectedUnits.length
      ? data.employeesByUnit.filter((item) => selectedUnits.includes(item.label))
      : data.employeesByUnit;
  }, [data, selectedUnits]);

  const unitOptions = useMemo(
    () => (data?.employeesByUnit ?? []).map((item) => ({ value: item.label, label: item.label })),
    [data],
  );

  const timeRangeControl = (
    <SegmentedControl
      value={timeRange}
      onChange={(value) => setTimeRange(value as TimeRange)}
      data={[
        { value: "month", label: "Tháng này" },
        { value: "quarter", label: "Quý này" },
        { value: "year", label: "Năm nay" },
      ]}
    />
  );

  const headerActions = (
    <Group gap="xs">
      {timeRangeControl}
      <Button variant="default" leftSection={<IconFileImport size={16} />} onClick={() => navigate(ROUTES.imports)}>Import Excel</Button>
      <Menu shadow="md" width={190}>
        <Menu.Target>
          <Button leftSection={<IconDownload size={16} />}>Xuất báo cáo</Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={() => void exportDashboardAsPng(dashboardRef.current)}>Tải PNG</Menu.Item>
          <Menu.Item onClick={() => window.print()}>In / lưu PDF</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          subtitle="Tổng quan vận hành HRM, chấm công, nghỉ phép và dữ liệu bàn giao lương."
          actions={headerActions}
        />
        <DashboardSkeleton />
      </>
    );
  }

  if (error) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  const queueTotal = data.pendingLeaveRequests + data.pendingMovements + data.pendingAttendanceExplanations;
  const probationCount = data.employeesByEmploymentStatus.find((item) => item.label === "PROBATION")?.value ?? 0;
  const timeRangeLabel =
    timeRange === "month" ? "Tháng này" :
    timeRange === "quarter" ? "Quý này" :
    "Năm nay";

  const metrics = [
    {
      title: "Tổng nhân sự",
      value: data.totalEmployees,
      meta: timeRangeLabel,
      tone: "blue" as const,
      icon: <IconUsers size={20} />,
      detail: (
        <Text size="xs" c="dimmed" className={styles.metricDetailText}>
          {selectedUnits.length ? `${selectedUnits.length} đơn vị đang lọc` : "Toàn hệ thống"}
        </Text>
      ),
    },
    {
      title: "Đang làm việc",
      value: data.activeEmployees,
      meta: "Tỷ lệ active",
      tone: "green" as const,
      icon: <IconUserCheck size={20} />,
      detail: (
        <div className={styles.kpiProgressWrap}>
          <div className={styles.kpiProgressTrack}>
            <div
              className={styles.kpiProgressFill}
              style={{ width: `${percent(data.activeEmployees, data.totalEmployees)}%` }}
            />
          </div>
          <Text size="xs" fw={750}>{percent(data.activeEmployees, data.totalEmployees)}%</Text>
        </div>
      ),
    },
    {
      title: "Đơn chờ duyệt",
      value: queueTotal,
      meta: "Cần xử lý",
      tone: "orange" as const,
      icon: <IconClockHour4 size={20} />,
      detail: (
        <PendingQueueMiniChart
          leave={data.pendingLeaveRequests}
          attendance={data.pendingAttendanceExplanations}
          movement={data.pendingMovements}
        />
      ),
    },
    {
      title: "Tuyển mới trong kỳ",
      value: data.newHiresThisMonth,
      meta: "Phát sinh trong kỳ",
      tone: "teal" as const,
      icon: <IconBriefcase size={20} />,
      detail: <Text size="xs" c="dimmed" className={styles.metricDetailText}>Hồ sơ mới trong kỳ hiện tại</Text>,
    },
    {
      title: "Nghỉ việc trong kỳ",
      value: data.terminatedThisMonth,
      meta: "Biến động rời công ty",
      tone: "red" as const,
      icon: <IconUserMinus size={20} />,
      detail: <Text size="xs" c="dimmed" className={styles.metricDetailText}>Cần theo dõi bàn giao</Text>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Tổng quan vận hành HRM, chấm công, nghỉ phép và dữ liệu bàn giao lương."
        actions={headerActions}
      />

      <Stack gap="md" ref={dashboardRef} className={styles.dashboardSurface}>
        <Paper p="md" className={styles.filterPanel}>
          <Group justify="space-between" align="flex-end" gap="md">
            <Stack gap={4}>
              <Text fw={750}>Bộ lọc Dashboard</Text>
              <Text size="xs" c="dimmed">Các biểu đồ cập nhật theo khoảng thời gian và đơn vị được chọn.</Text>
            </Stack>
            <Group align="flex-end" gap="sm" className={styles.filterControls}>
              <MultiSelect
                searchable
                clearable
                placeholder="Lọc theo đơn vị"
                data={unitOptions}
                value={selectedUnits}
                onChange={setSelectedUnits}
                w={260}
              />
              <Tooltip label="Tải lại dữ liệu">
                <ActionIcon variant="default" size={36} loading={isFetching} onClick={() => void refetch()}>
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="xs">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <WorkforceMovementChart
            hires={data.newHiresThisMonth}
            terminations={data.terminatedThisMonth}
          />
          <DonutChart
            title="Cơ cấu nhân sự theo đơn vị"
            items={filteredUnits}
            centerLabel="Tổng"
            onSliceClick={(item) => navigate(employeeListUrl({
              dashboardSlice: "unit",
              search: item.label,
            }))}
          />
          <EmployeeStatusColumnChart
            title="Nhân sự theo trạng thái"
            items={data.employeesByEmploymentStatus}
            onBarClick={(item) => navigate(employeeListUrl({
              dashboardSlice: "employmentStatus",
              status: item.label,
            }))}
          />
          <AttendanceStackedBars items={data.attendanceThisMonth.byDepartment} />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <TopLateBarChart
            items={data.attendanceThisMonth.topLateEmployees}
            onViewAll={() => navigate(ROUTES.attendance)}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
          <WorkQueue
            pendingLeave={data.pendingLeaveRequests}
            pendingMovements={data.pendingMovements}
            pendingAttendance={data.pendingAttendanceExplanations}
            navigate={navigate}
          />
          <HrAlerts
            leaveRiskCount={data.leaveExpiryRisks.items.length}
            leaveRiskMessage={data.leaveExpiryRisks.message}
            probationCount={probationCount}
            navigate={navigate}
          />
          <PayrollHandoffCard
            closedPeriods={data.payrollHandoff.closedPeriods}
            latestPeriod={data.payrollHandoff.latestClosedPeriod}
            annualLeaveDaysUsed={data.attendanceThisMonth.annualLeaveDaysUsed}
          />
        </SimpleGrid>
      </Stack>
    </>
  );
}
