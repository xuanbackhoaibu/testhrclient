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

const chartPalette = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#64748b"];
const lateThreshold = 3;

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

function employeeListUrl(params: Record<string, string>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return `${ROUTES.employees}?${searchParams.toString()}`;
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
    <Paper className={`${styles.metricCard} ${styles[`metricCard_${tone}`]}`} p="md">
      <Stack gap="xs" h="100%" justify="space-between">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text size="xs" fw={750} c="dimmed" className={styles.metricLabel}>
            {title}
          </Text>
          <ThemeIcon className={styles.metricIcon} color={tone} variant="light" size={30}>
            {icon}
          </ThemeIcon>
        </Group>
        <Group align="flex-end" justify="space-between" gap="xs" wrap="nowrap">
          <Text className={styles.metricValue}>{formatNumber(value)}</Text>
          <Text size="xs" c="dimmed" ta="right" className={styles.metricMeta}>{meta}</Text>
        </Group>
      {detail ? <div className={styles.metricDetail}>{detail}</div> : null}
      </Stack>
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
          <Skeleton key={index} height={152} radius="md" />
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
  let offset = 25;
  const segments = total
    ? items.map((item, index) => {
        const ratio = item.value / total;
        const segment = {
          item,
          color: chartPalette[index % chartPalette.length],
          dasharray: `${ratio * 100} ${100 - ratio * 100}`,
          dashoffset: offset,
          ratio,
        };
        offset -= ratio * 100;
        return segment;
      })
    : [];

  return (
    <Paper className={styles.chartPanel} p="md">
      <Group justify="space-between" align="flex-start" mb="sm">
        <Stack gap={2}>
          <Text fw={750}>{title}</Text>
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
            <svg className={styles.donut} viewBox="0 0 44 44" role="img" aria-label={title}>
              <circle className={styles.donutTrack} cx="22" cy="22" r="15.915" />
              {segments.map((segment) => (
                <Tooltip
                  key={segment.item.label}
                  label={`${segment.item.label}: ${formatNumber(segment.item.value)} (${percent(segment.item.value, total)}%)`}
                  withArrow
                >
                  <circle
                    className={styles.donutSegment}
                    cx="22"
                    cy="22"
                    r="15.915"
                    stroke={segment.color}
                    strokeDasharray={segment.dasharray}
                    strokeDashoffset={segment.dashoffset}
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
              <Text fw={800} className={styles.donutTotal}>{formatNumber(total)}</Text>
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
                <span className={styles.legendValue}>{formatNumber(segment.item.value)} · {percent(segment.item.value, total)}%</span>
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
          <Text fw={750}>Nhân sự đi muộn nhiều nhất</Text>
          <Text size="xs" c="dimmed">Ngưỡng cảnh báo: từ {lateThreshold} lần/tháng.</Text>
        </Stack>
        <Group gap="xs">
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
        <Stack gap="sm">
          {items.slice(0, 8).map((item) => {
            const width = clamp((item.lateCount / maxLate) * 100, 8, 100);
            const warning = item.lateCount >= lateThreshold;
            return (
              <Tooltip
                key={item.employeeId}
                label={`${item.fullName ?? item.employeeId}: ${formatNumber(item.lateCount)} lần, ${formatNumber(item.totalLateMinutes)} phút`}
                withArrow
              >
                <div className={styles.barRow}>
                  <Text size="sm" className={styles.barLabel}>{item.fullName ?? item.employeeId}</Text>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${warning ? styles.barFill_danger : styles.barFill_normal}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <Text size="sm" fw={750} className={styles.barValue}>{formatNumber(item.lateCount)}</Text>
                </div>
              </Tooltip>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

function MetricVerticalBarChart({
  title,
  items,
  onBarClick,
}: {
  title: string;
  items: DashboardMetric[];
  onBarClick?: (item: DashboardMetric) => void;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Paper className={styles.chartPanel} p="md">
      <Group justify="space-between" mb="sm">
        <Stack gap={2}>
          <Text fw={750}>{title}</Text>
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
        <div className={styles.verticalBarChart}>
          {items.map((item, index) => {
            const height = clamp((item.value / maxValue) * 100, 8, 100);
            const color = chartPalette[index % chartPalette.length];
            return (
              <Tooltip
                key={item.label}
                label={`${item.label}: ${formatNumber(item.value)} (${percent(item.value, items.reduce((sum, current) => sum + current.value, 0))}%)`}
                withArrow
              >
                <button
                  className={styles.verticalBarItem}
                  type="button"
                  onClick={() => onBarClick?.(item)}
                >
                  <div className={styles.verticalBarTrack}>
                    <div className={styles.verticalBarFill} style={{ height: `${height}%`, backgroundColor: color }} />
                  </div>
                  <Text size="sm" fw={750} className={styles.verticalBarValue}>{formatNumber(item.value)}</Text>
                  <Text size="xs" c="dimmed" className={styles.verticalBarLabel}>{item.label}</Text>
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </Paper>
  );
}

function AttendanceStackedBars({ items }: { items: DashboardAttendanceRate[] }) {
  return (
    <Paper className={styles.chartPanel} p="md">
      <Group justify="space-between" mb="sm">
        <Stack gap={2}>
          <Text fw={750}>Tỷ lệ chuyên cần theo phòng ban</Text>
          <Text size="xs" c="dimmed">So sánh ngày đi làm và ngày vắng/nghỉ.</Text>
        </Stack>
        <Group gap="xs">
          <Badge color="green" variant="light">Ngày đi làm</Badge>
          <Badge color="red" variant="light">Vắng/nghỉ</Badge>
        </Group>
      </Group>
      {items.length === 0 ? (
        <Stack align="center" py="xl">
          <EmptyIllustration />
          <Text size="sm" c="dimmed">Chưa có dữ liệu chuyên cần theo phòng ban.</Text>
        </Stack>
      ) : (
        <Stack gap="sm">
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
                  <Group justify="space-between">
                    <Text size="sm" fw={650}>{label}</Text>
                    <Text size="xs" c="dimmed">{item.attendanceRate.toLocaleString("vi-VN")}%</Text>
                  </Group>
                  <div className={styles.stackedTrack}>
                    <div className={styles.stackedAttend} style={{ width: `${attendedPercent}%` }} />
                    <div className={styles.stackedAbsent} style={{ width: `${absentPercent}%` }} />
                  </div>
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
      <Group justify="space-between" mb="sm">
        <Text fw={750}>Công việc cần làm</Text>
        <Badge color={tasks.length ? "orange" : "green"} variant="light">{tasks.reduce((sum, task) => sum + task.value, 0)} việc</Badge>
      </Group>
      {tasks.length === 0 ? (
        <Text size="sm" c="dimmed">Không có hàng chờ xử lý trong kỳ này.</Text>
      ) : (
        <Stack gap="xs">
          {tasks.slice(0, 5).map((task) => (
            <Group key={task.label} className={styles.todoRow} justify="space-between" wrap="nowrap">
              <Stack gap={0}>
                <Text size="sm" fw={650}>{task.label}</Text>
                <Text size="xs" c="dimmed">{formatNumber(task.value)} hồ sơ cần thao tác</Text>
              </Stack>
              <Button size="xs" variant="light" onClick={() => navigate(task.route)}>{task.action}</Button>
            </Group>
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
    },
    {
      label: `${formatNumber(leaveRiskCount)} cảnh báo phép sắp hết hạn`,
      description: leaveRiskMessage ?? "Đang chờ dữ liệu quỹ phép.",
      route: ROUTES.leave,
    },
    {
      label: "Hợp đồng sắp hết hạn",
      description: "Mở module hợp đồng để kiểm tra các hợp đồng cần gia hạn.",
      route: ROUTES.contracts,
    },
  ];

  return (
    <Paper className={styles.actionPanel} p="md">
      <Text fw={750} mb="sm">Cảnh báo nhân sự</Text>
      <Stack gap="xs">
        {alerts.map((alert) => (
          <button key={alert.label} className={styles.alertRow} type="button" onClick={() => navigate(alert.route)}>
            <ThemeIcon color="orange" variant="light" size={34}><IconAlertTriangle size={18} /></ThemeIcon>
            <Stack gap={0}>
              <Text size="sm" fw={650}>{alert.label}</Text>
              <Text size="xs" c="dimmed" lineClamp={2}>{alert.description}</Text>
            </Stack>
          </button>
        ))}
      </Stack>
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
        <div className={styles.miniStatGrid}>
          <span>Nghỉ <strong>{formatNumber(data.pendingLeaveRequests)}</strong></span>
          <span>Công <strong>{formatNumber(data.pendingAttendanceExplanations)}</strong></span>
          <span>Điều chuyển <strong>{formatNumber(data.pendingMovements)}</strong></span>
        </div>
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

        <SimpleGrid cols={{ base: 1, sm: 2, xl: 5 }} spacing="md">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <DonutChart
            title="Cơ cấu nhân sự theo đơn vị"
            items={filteredUnits}
            centerLabel="Tổng"
            onSliceClick={(item) => navigate(employeeListUrl({
              dashboardSlice: "unit",
              search: item.label,
            }))}
          />
          <AttendanceStackedBars items={data.attendanceThisMonth.byDepartment} />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <MetricVerticalBarChart
            title="Nhân sự theo trạng thái"
            items={data.employeesByEmploymentStatus}
            onBarClick={(item) => navigate(employeeListUrl({
              dashboardSlice: "employmentStatus",
              status: item.label,
            }))}
          />
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
          <Paper className={styles.actionPanel} p="md">
            <Text fw={750} mb="sm">Chuẩn bị bàn giao lương</Text>
            <Stack gap="xs">
              <Group justify="space-between"><Text size="sm" c="dimmed">Kỳ công đã chốt</Text><Text size="sm" fw={750}>{formatNumber(data.payrollHandoff.closedPeriods)}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Kỳ mới nhất</Text><Text size="sm" fw={750}>{data.payrollHandoff.latestClosedPeriod ? `${data.payrollHandoff.latestClosedPeriod.month}/${data.payrollHandoff.latestClosedPeriod.year}` : "-"}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Phép năm đã dùng</Text><Text size="sm" fw={750}>{data.attendanceThisMonth.annualLeaveDaysUsed.toLocaleString("vi-VN")}</Text></Group>
              <Group justify="space-between"><Text size="sm" c="dimmed">Định dạng lương</Text><Badge color="yellow" variant="light">Chờ chốt</Badge></Group>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </>
  );
}
