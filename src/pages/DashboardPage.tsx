import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Button,
  Group,
  Menu,
  SegmentedControl,
  Select,
  Skeleton,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAddressBook,
  IconAlertTriangle,
  IconArrowRight,
  IconCalendar,
  IconCalendarCheck,
  IconChartBar,
  IconCheck,
  IconChevronRight,
  IconClockHour4,
  IconDownload,
  IconFileSpreadsheet,
  IconFileText,
  IconPrinter,
  IconRefresh,
  IconTable,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { useDashboardSummary } from "../features/dashboard/useDashboardSummary";
import { ErrorState } from "../shared/components/ErrorState";
import { PageHeader } from "../shared/components/PageHeader";
import { ROUTES } from "../shared/constants/routes";
import styles from "./DashboardPage.module.css";

type ChartItem = {
  label: string;
  value: number;
};

const donutColors = [
  "#0068FF", // Primary Blue
  "#00B4D8", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#94A3B8", // Slate
];

const statusStyles: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  ACTIVE: {
    label: "Chính thức",
    color: "#059669",
    bg: "#ECFDF5",
    dot: "#10B981",
  },
  PROBATION: {
    label: "Thử việc",
    color: "#0068FF",
    bg: "#EFF6FF",
    dot: "#0068FF",
  },
  INACTIVE: {
    label: "Tạm hoãn",
    color: "#D97706",
    bg: "#FFFBEB",
    dot: "#F59E0B",
  },
  TERMINATED: {
    label: "Đã thôi việc",
    color: "#E11D48",
    bg: "#FFF1F2",
    dot: "#E11D48",
  },
};

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function employeeListUrl(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  return `${ROUTES.employees}?${searchParams.toString()}`;
}

function getInitials(name?: string | null) {
  if (!name) return "NV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Skeleton Loader chuẩn Enterprise */
function DashboardSkeletonLoader() {
  return (
    <div className={styles.zaloDashboardContainer}>
      <Skeleton height={46} radius="md" />
      <Skeleton height={94} radius="md" />
      <div className={styles.twoColumnGrid}>
        <Skeleton height={320} radius="md" />
        <Skeleton height={320} radius="md" />
      </div>
      <div className={styles.twoColumnGrid}>
        <Skeleton height={320} radius="md" />
        <Skeleton height={320} radius="md" />
      </div>
    </div>
  );
}

/** 1. Thanh Lọc Đơn vị & Lối tắt điều hướng phân hệ HRM */
function EnterpriseQuickBar({
  selectedUnit,
  unitOptions,
  onSelectUnit,
  onNavigate,
}: {
  selectedUnit: string;
  unitOptions: Array<{ value: string; label: string }>;
  onSelectUnit: (unit: string) => void;
  onNavigate: (path: string) => void;
}) {
  const navLinks = [
    { label: "Danh bạ nhân sự", icon: IconAddressBook, path: ROUTES.employees },
    { label: "Bảng chấm công", icon: IconClockHour4, path: ROUTES.attendance },
    { label: "Đơn từ & Nghỉ phép", icon: IconCalendar, path: ROUTES.leave },
    { label: "Điều chuyển nội bộ", icon: IconFileText, path: ROUTES.movements },
    { label: "Import Excel", icon: IconFileSpreadsheet, path: ROUTES.imports },
  ];

  return (
    <div className={`${styles.enterpriseSearchBar} ${styles.fadeInItem1}`}>
      {/* Bộ lọc đơn vị áp dụng */}
      <div className={styles.unitFilterGroup}>
        <span className={styles.unitFilterLabel}>Đơn vị áp dụng:</span>
        <Select
          value={selectedUnit}
          onChange={(val) => onSelectUnit(val ?? "ALL")}
          data={unitOptions}
          size="xs"
          radius="md"
          className={styles.unitSelectorBar}
          allowDeselect={false}
        />
      </div>

      {/* Danh mục lối tắt điều hướng nhanh */}
      <div className={styles.quickNavLinksRow}>
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.label}
              type="button"
              className={styles.quickNavLinkItem}
              onClick={() => onNavigate(link.path)}
            >
              <Icon size={14} />
              <span>{link.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 2. Băng 5 chỉ số điều hành HRM */
function ExecutiveMetricStrip({
  totalEmployees,
  activeEmployees,
  newHires,
  terminated,
  pendingTotal,
  pendingLeave,
  pendingAttendance,
  pendingMovements,
  onNavigate,
}: {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  terminated: number;
  pendingTotal: number;
  pendingLeave: number;
  pendingAttendance: number;
  pendingMovements: number;
  onNavigate: (url: string) => void;
}) {
  const activePct = percent(activeEmployees, totalEmployees);

  return (
    <div className={`${styles.executiveMetricStrip} ${styles.fadeInItem2}`}>
      {/* 1. Tổng nhân sự */}
      <div
        className={styles.metricStripCell}
        onClick={() => onNavigate(ROUTES.employees)}
        role="button"
        tabIndex={0}
      >
        <div className={styles.metricCellHeader}>
          <span className={styles.metricCellLabel}>Tổng nhân sự</span>
          <span className={`${styles.metricCellBadge} ${styles.badgeNeutral}`}>
            Toàn bộ
          </span>
        </div>
        <div className={styles.metricCellValueRow}>
          <span className={styles.metricCellValue}>
            {formatNumber(totalEmployees)}
          </span>
        </div>
        <div className={styles.metricCellFooterRow}>
          <span className={styles.metricCellSub}>Quy mô toàn hệ thống</span>
        </div>
      </div>

      {/* 2. Đang làm việc */}
      <div
        className={styles.metricStripCell}
        onClick={() => onNavigate(employeeListUrl({ status: "ACTIVE" }))}
        role="button"
        tabIndex={0}
      >
        <div className={styles.metricCellHeader}>
          <span className={styles.metricCellLabel}>Đang làm việc</span>
          <span className={`${styles.metricCellBadge} ${styles.badgeSuccess}`}>
            {activePct}%
          </span>
        </div>
        <div className={styles.metricCellValueRow}>
          <span className={styles.metricCellValue}>
            {formatNumber(activeEmployees)}
          </span>
        </div>
        <div className={styles.metricCellFooterRow}>
          <span className={styles.metricCellSub}>Chính thức & thử việc</span>
        </div>
      </div>

      {/* 3. Tuyển mới kỳ này */}
      <div
        className={styles.metricStripCell}
        onClick={() => onNavigate(employeeListUrl({ created: "current-period" }))}
        role="button"
        tabIndex={0}
      >
        <div className={styles.metricCellHeader}>
          <span className={styles.metricCellLabel}>Tuyển mới kỳ này</span>
          <span className={`${styles.metricCellBadge} ${styles.badgeInfo}`}>
            +{newHires} mới
          </span>
        </div>
        <div className={styles.metricCellValueRow}>
          <span className={styles.metricCellValue}>{formatNumber(newHires)}</span>
        </div>
        <div className={styles.metricCellFooterRow}>
          <span className={styles.metricCellSub}>Hồ sơ gia nhập kỳ này</span>
        </div>
      </div>

      {/* 4. Thôi việc kỳ này */}
      <div
        className={styles.metricStripCell}
        onClick={() => onNavigate(employeeListUrl({ status: "TERMINATED" }))}
        role="button"
        tabIndex={0}
      >
        <div className={styles.metricCellHeader}>
          <span className={styles.metricCellLabel}>Thôi việc kỳ này</span>
          <span className={`${styles.metricCellBadge} ${styles.badgeDanger}`}>
            -{terminated}
          </span>
        </div>
        <div className={styles.metricCellValueRow}>
          <span className={styles.metricCellValue}>{formatNumber(terminated)}</span>
        </div>
        <div className={styles.metricCellFooterRow}>
          <span className={styles.metricCellSub}>Biến động giảm nhân sự</span>
        </div>
      </div>

      {/* 5. Yêu cầu chờ duyệt */}
      <div
        className={styles.metricStripCell}
        onClick={() => onNavigate(ROUTES.leave)}
        role="button"
        tabIndex={0}
      >
        <div className={styles.metricCellHeader}>
          <span className={styles.metricCellLabel}>Yêu cầu chờ duyệt</span>
          <span
            className={`${styles.metricCellBadge} ${
              pendingTotal > 0 ? styles.badgeWarning : styles.badgeSuccess
            }`}
          >
            {pendingTotal > 0 ? `${pendingTotal} việc` : "Hoàn tất"}
          </span>
        </div>
        <div className={styles.metricCellValueRow}>
          <span className={styles.metricCellValue}>
            {formatNumber(pendingTotal)}
          </span>
        </div>
        <div className={styles.metricCellFooterRow}>
          <span className={styles.metricCellSub}>
            {pendingLeave} phép, {pendingAttendance} công, {pendingMovements} chuyển
          </span>
        </div>
      </div>
    </div>
  );
}

/** 3. Biểu đồ tròn (Donut Chart) SVG hoàn toàn tương tác trên hình tròn */
function DonutStructureChart({
  title,
  items,
  onItemClick,
}: {
  title: string;
  items: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
}) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [hoveredItem, setHoveredItem] = useState<ChartItem | null>(null);

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const nonZeroItems = useMemo(
    () => items.filter((item) => item.value > 0),
    [items],
  );

  // Cấu hình thông số hình học SVG Donut
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  const slices = useMemo(() => {
    return nonZeroItems.reduce<
      Array<{
        item: ChartItem;
        fraction: number;
        percentVal: number;
        strokeDasharray: string;
        strokeDashoffset: number;
        color: string;
      }>
    >((acc, item, index) => {
      const fraction = total > 0 ? item.value / total : 0;
      const prevSlice = acc[acc.length - 1];
      const strokeDashoffset = prevSlice
        ? prevSlice.strokeDashoffset - prevSlice.fraction * circumference
        : 0;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const color = donutColors[index % donutColors.length];

      return [
        ...acc,
        {
          item,
          fraction,
          percentVal: percent(item.value, total),
          strokeDasharray,
          strokeDashoffset,
          color,
        },
      ];
    }, []);
  }, [nonZeroItems, total, circumference]);

  const centerNumber = hoveredItem ? formatNumber(hoveredItem.value) : formatNumber(total);
  const centerLabel = hoveredItem ? hoveredItem.label : "Tổng nhân sự";
  const centerSub = hoveredItem
    ? `${percent(hoveredItem.value, total)}%`
    : `${items.length} đơn vị`;

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div>
          <Text className={styles.cardTitle}>{title}</Text>
        </div>
        <Group gap={8}>
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(val) => setViewMode(val as "chart" | "table")}
            data={[
              {
                value: "chart",
                label: (
                  <Tooltip label="Xem dạng biểu đồ" withArrow>
                    <IconChartBar size={14} style={{ display: "block" }} />
                  </Tooltip>
                ),
              },
              {
                value: "table",
                label: (
                  <Tooltip label="Xem dạng bảng" withArrow>
                    <IconTable size={14} style={{ display: "block" }} />
                  </Tooltip>
                ),
              },
            ]}
          />
          <span className={styles.pillBadge}>{formatNumber(total)} nhân sự</span>
        </Group>
      </div>

      <div className={styles.cardBodyUniform}>
        {viewMode === "chart" ? (
          <div className={styles.donutBody}>
            <div className={styles.donutGraphicBox}>
              <svg
                viewBox="0 0 160 160"
                className={styles.donutInteractiveSvg}
                role="img"
                aria-label={title}
              >
                {/* Vòng nền mờ */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  className={styles.donutBackgroundCircle}
                  strokeWidth="20"
                />

                {/* Các lát cắt tương tác xoay góc -90 độ để bắt đầu từ đỉnh 12h */}
                <g transform="rotate(-90 80 80)">
                  {slices.map((slice) => {
                    const isHovered = hoveredItem?.label === slice.item.label;
                    return (
                      <Tooltip
                        key={slice.item.label}
                        label={`${slice.item.label}: ${formatNumber(slice.item.value)} người (${slice.percentVal}%) - Bấm để lọc`}
                        withArrow
                      >
                        <circle
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? 26 : 20}
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          className={styles.donutSvgSlice}
                          style={{
                            opacity: hoveredItem && !isHovered ? 0.35 : 1,
                          }}
                          onMouseEnter={() => setHoveredItem(slice.item)}
                          onMouseLeave={() => setHoveredItem(null)}
                          onClick={() => onItemClick?.(slice.item)}
                        />
                      </Tooltip>
                    );
                  })}
                </g>
              </svg>

              {/* Thông tin ở tâm biểu đồ cập nhật theo lát bánh đang rê chuột */}
              <div className={styles.donutCenterInfo}>
                <span className={styles.donutCenterNumber}>{centerNumber}</span>
                <span className={styles.donutCenterText}>{centerLabel}</span>
                <span className={styles.donutCenterSub}>{centerSub}</span>
              </div>
            </div>

            <div className={styles.donutLegendList}>
              {items.map((item, index) => {
                const itemPercent = percent(item.value, total);
                const color = donutColors[index % donutColors.length];
                const isHovered = hoveredItem?.label === item.label;

                return (
                  <Tooltip
                    key={item.label}
                    label={`${item.label}: ${formatNumber(item.value)} người (${itemPercent}%) - Bấm xem danh sách`}
                    withArrow
                  >
                    <button
                      type="button"
                      className={`${styles.legendRowItem} ${isHovered ? styles.legendRowHovered : ""}`}
                      onMouseEnter={() => setHoveredItem(item)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => onItemClick?.(item)}
                    >
                      <div className={styles.legendRowHeader}>
                        <div className={styles.legendLeft}>
                          <span
                            className={styles.legendDot}
                            style={{ backgroundColor: color }}
                          />
                          <span className={styles.legendName}>{item.label}</span>
                        </div>
                        <div className={styles.legendRight}>
                          <span className={styles.legendValue}>
                            {formatNumber(item.value)}
                          </span>
                          <span className={styles.legendPercent}>
                            {itemPercent}%
                          </span>
                        </div>
                      </div>
                      <div className={styles.legendProgressBarTrack}>
                        <div
                          className={styles.legendProgressBarFill}
                          style={{
                            width: `${itemPercent}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={styles.tableCardWrap}>
            <Table className={styles.tableModern} verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Đơn vị / Công ty</Table.Th>
                  <Table.Th ta="right">Số lượng</Table.Th>
                  <Table.Th ta="right">Tỷ lệ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item, index) => {
                  const itemPercent = percent(item.value, total);
                  const color = donutColors[index % donutColors.length];
                  return (
                    <Table.Tr
                      key={item.label}
                      className={styles.tableRowClickable}
                      onClick={() => onItemClick?.(item)}
                    >
                      <Table.Td>
                        <div className={styles.legendLeft}>
                          <span
                            className={styles.legendDot}
                            style={{ backgroundColor: color }}
                          />
                          <span className={styles.legendName}>{item.label}</span>
                        </div>
                      </Table.Td>
                      <Table.Td ta="right" fw={600}>
                        {formatNumber(item.value)}
                      </Table.Td>
                      <Table.Td ta="right" c="dimmed">
                        {itemPercent}%
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

/** 4. Biểu đồ cột (Column Chart) */
function ColumnStatusChart({
  title,
  items,
  onItemClick,
}: {
  title: string;
  items: ChartItem[];
  onItemClick?: (item: ChartItem) => void;
}) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div>
          <Text className={styles.cardTitle}>{title}</Text>
        </div>
        <Group gap={8}>
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(val) => setViewMode(val as "chart" | "table")}
            data={[
              {
                value: "chart",
                label: (
                  <Tooltip label="Xem dạng biểu đồ cột" withArrow>
                    <IconChartBar size={14} style={{ display: "block" }} />
                  </Tooltip>
                ),
              },
              {
                value: "table",
                label: (
                  <Tooltip label="Xem dạng bảng" withArrow>
                    <IconTable size={14} style={{ display: "block" }} />
                  </Tooltip>
                ),
              },
            ]}
          />
          <span className={styles.pillBadge}>{formatNumber(total)} hồ sơ</span>
        </Group>
      </div>

      <div className={styles.cardBodyUniform}>
        {viewMode === "chart" ? (
          <div className={styles.columnChartWrapper}>
            <div className={styles.chartGridLines}>
              <div className={styles.gridLineRow}>
                <span className={styles.gridLineLabel}>100%</span>
                <span className={styles.gridLine} />
              </div>
              <div className={styles.gridLineRow}>
                <span className={styles.gridLineLabel}>50%</span>
                <span className={styles.gridLine} />
              </div>
              <div className={styles.gridLineRow}>
                <span className={styles.gridLineLabel}>0%</span>
                <span className={styles.gridLine} />
              </div>
            </div>

            <div className={styles.columnsContainer}>
              {items.map((item) => {
                const config = statusStyles[item.label] ?? {
                  label: item.label,
                  color: "#64748B",
                  bg: "#EFF6FF",
                  dot: "#0068FF",
                };
                const heightPct =
                  item.value === 0
                    ? 4
                    : Math.max(Math.round((item.value / max) * 100), 8);
                const itemPercent = percent(item.value, total);

                return (
                  <Tooltip
                    key={item.label}
                    label={`${config.label} (${item.label}): ${formatNumber(item.value)} hồ sơ (${itemPercent}%) - Bấm để lọc`}
                    withArrow
                  >
                    <button
                      type="button"
                      className={styles.columnBarItem}
                      onClick={() => onItemClick?.(item)}
                    >
                      <span className={styles.columnTopNumber}>
                        {formatNumber(item.value)}
                      </span>

                      <div className={styles.columnTrack}>
                        <div
                          className={styles.columnBarFill}
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: config.dot,
                          }}
                        />
                      </div>

                      <div className={styles.columnLabelGroup}>
                        <span className={styles.columnBadge}>
                          {config.label}
                        </span>
                        <span className={styles.columnPercentTag}>
                          {itemPercent}%
                        </span>
                      </div>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={styles.tableCardWrap}>
            <Table className={styles.tableModern} verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Trạng thái</Table.Th>
                  <Table.Th>Mã hệ thống</Table.Th>
                  <Table.Th ta="right">Số lượng</Table.Th>
                  <Table.Th ta="right">Tỷ lệ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item) => {
                  const config = statusStyles[item.label] ?? {
                    label: item.label,
                    color: "#64748B",
                    bg: "#EFF6FF",
                    dot: "#0068FF",
                  };
                  const itemPercent = percent(item.value, total);
                  return (
                    <Table.Tr
                      key={item.label}
                      className={styles.tableRowClickable}
                      onClick={() => onItemClick?.(item)}
                    >
                      <Table.Td>
                        <span className={styles.columnBadge}>
                          {config.label}
                        </span>
                      </Table.Td>
                      <Table.Td c="dimmed">{item.label}</Table.Td>
                      <Table.Td ta="right" fw={600}>
                        {formatNumber(item.value)}
                      </Table.Td>
                      <Table.Td ta="right" c="dimmed">
                        {itemPercent}%
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

/** 5. Hàng chờ xử lý yêu cầu */
function ModernPendingQueueCard({
  pendingLeave,
  pendingAttendance,
  pendingMovements,
  onOpen,
}: {
  pendingLeave: number;
  pendingAttendance: number;
  pendingMovements: number;
  onOpen: (route: string) => void;
}) {
  const total = pendingLeave + pendingAttendance + pendingMovements;

  const tasks = [
    {
      label: "Đơn xin nghỉ phép",
      value: pendingLeave,
      icon: IconCalendarCheck,
      route: ROUTES.leave,
      actionText: "Duyệt đơn",
    },
    {
      label: "Giải trình chấm công",
      value: pendingAttendance,
      icon: IconClockHour4,
      route: ROUTES.attendance,
      actionText: "Kiểm tra",
    },
    {
      label: "Đề xuất điều chuyển",
      value: pendingMovements,
      icon: IconFileText,
      route: ROUTES.movements,
      actionText: "Phê duyệt",
    },
  ];

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div>
          <Text className={styles.cardTitle}>Hàng chờ xử lý yêu cầu</Text>
        </div>
        <span className={styles.pillBadge}>
          {total > 0 ? `${total} việc cần xử lý` : "Đã duyệt hết"}
        </span>
      </div>

      <div className={styles.cardBodyUniform}>
        <div className={styles.cleanQueueList}>
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <div
                key={task.label}
                className={styles.cleanQueueRow}
                onClick={() => onOpen(task.route)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.cleanQueueLeft}>
                  <div className={styles.cleanQueueIconBox}>
                    <Icon size={18} />
                  </div>
                  <div className={styles.cleanQueueTitleRow}>
                    <span className={styles.cleanQueueTitle}>{task.label}</span>
                    {task.value > 0 ? (
                      <span className={styles.cleanCountBadgeActive}>
                        {task.value} chờ duyệt
                      </span>
                    ) : (
                      <span className={styles.cleanCountBadgeMuted}>0 việc</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.cleanActionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(task.route);
                  }}
                >
                  <span>{task.actionText}</span>
                  <IconChevronRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 6. Chuẩn bị bàn giao lương */
function ModernPayrollPreparationCard({
  closedPeriods,
  latestPeriod,
  formatStatus,
  annualLeaveDaysUsed,
  leaveBalanceMode,
  leaveRiskCount,
  leaveRiskMessage,
  onOpenAttendance,
}: {
  closedPeriods: number;
  latestPeriod?: { month: number; year: number } | null;
  formatStatus?: string | null;
  annualLeaveDaysUsed: number;
  leaveBalanceMode?: string | null;
  leaveRiskCount: number;
  leaveRiskMessage?: string | null;
  onOpenAttendance: () => void;
}) {
  const periodText = latestPeriod
    ? `${latestPeriod.month}/${latestPeriod.year}`
    : "7/2026";

  const formatStatusLabel =
    formatStatus === "CONFIRMED" || formatStatus === "CLOSED"
      ? "ĐÃ CHỐT"
      : "CHỜ CHỐT";

  const leaveBalanceLabel =
    leaveBalanceMode === "CONFIRMED"
      ? "ĐÃ ĐỐI SOÁT"
      : "ĐANG ĐỐI CHIẾU CSV";

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div>
          <Text className={styles.cardTitle}>Chuẩn bị bàn giao lương</Text>
        </div>
        <button
          type="button"
          className={styles.headerActionLink}
          onClick={onOpenAttendance}
        >
          <span>Bảng chấm công</span>
          <IconArrowRight size={13} />
        </button>
      </div>

      <div className={styles.cardBodyUniform}>
        <div className={styles.payrollCleanWrap}>
          {/* Lưới 4 ô chỉ số nghiệp vụ bàn giao lương */}
          <div className={styles.payrollGridTwoByTwo}>
            {/* Ô 1: Kỳ công đã chốt */}
            <div className={styles.payrollGridBox}>
              <div className={styles.payrollBoxHeader}>
                <span className={styles.payrollBoxLabel}>Kỳ công đã chốt</span>
                <span className={`${styles.payrollBoxTag} ${styles.tagBlue}`}>
                  Hoàn tất
                </span>
              </div>
              <div className={styles.payrollBoxNumberRow}>
                <span className={styles.payrollBoxBigNumber}>
                  {formatNumber(closedPeriods)}
                </span>
                <span className={styles.payrollBoxUnit}>kỳ công</span>
              </div>
            </div>

            {/* Ô 2: Kỳ mới nhất & Trạng thái định dạng */}
            <div className={styles.payrollGridBox}>
              <div className={styles.payrollBoxHeader}>
                <span className={styles.payrollBoxLabel}>Kỳ mới nhất</span>
                <span
                  className={`${styles.payrollBoxTag} ${
                    formatStatusLabel === "CHỜ CHỐT" ? styles.tagAmber : styles.tagGreen
                  }`}
                >
                  {formatStatusLabel}
                </span>
              </div>
              <div className={styles.payrollBoxNumberRow}>
                <span className={`${styles.payrollBoxBigNumber} ${styles.periodBigNumber}`}>
                  {periodText}
                </span>
              </div>
            </div>

            {/* Ô 3: Phép năm đã dùng */}
            <div className={styles.payrollGridBox}>
              <div className={styles.payrollBoxHeader}>
                <span className={styles.payrollBoxLabel}>Phép đã dùng</span>
                <span className={`${styles.payrollBoxTag} ${styles.tagSlate}`}>
                  Tháng này
                </span>
              </div>
              <div className={styles.payrollBoxNumberRow}>
                <span className={styles.payrollBoxBigNumber}>
                  {annualLeaveDaysUsed.toLocaleString("vi-VN")}
                </span>
                <span className={styles.payrollBoxUnit}>ngày</span>
              </div>
            </div>

            {/* Ô 4: Quỹ phép năm */}
            <div className={styles.payrollGridBox}>
              <div className={styles.payrollBoxHeader}>
                <span className={styles.payrollBoxLabel}>Quỹ phép</span>
                <span className={`${styles.payrollBoxTag} ${styles.tagCyan}`}>
                  Năm 2026
                </span>
              </div>
              <div className={styles.payrollBoxNumberRow}>
                <span
                  className={`${styles.payrollBoxBigNumber} ${styles.periodBigNumber}`}
                  style={{ color: "#0891b2", fontSize: "14px" }}
                >
                  {leaveBalanceLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Dải thông báo Phép sắp hết hạn */}
          <div
            className={`${styles.cleanRiskFooter} ${
              leaveRiskCount > 0 ? styles.riskFooterAlert : styles.riskFooterNeutral
            }`}
          >
            <div className={styles.cleanRiskLeft}>
              {leaveRiskCount > 0 ? (
                <IconAlertTriangle size={15} className={styles.riskIconAlert} />
              ) : (
                <IconClockHour4 size={15} className={styles.riskIconNeutral} />
              )}
              <span className={styles.riskDescText}>
                {leaveRiskMessage ??
                  "Chua hien thi phep sap het han cho toi khi HR doi chieu xong quy phep Excel/CSV."}
              </span>
            </div>
            <span className={styles.riskCountBadge}>
              {leaveRiskCount} sắp hết hạn
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 7. Tỷ lệ chuyên cần theo bộ phận */
function ModernAttendanceRatesCard({
  items,
}: {
  items: Array<{
    unitName?: string;
    departmentName?: string;
    workDays: number;
    attendedDays: number;
    attendanceRate: number;
  }>;
}) {
  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div>
          <Text className={styles.cardTitle}>Tỷ lệ chuyên cần theo bộ phận</Text>
        </div>
        <span className={styles.pillBadge}>{items.length} bộ phận</span>
      </div>

      <div className={styles.cardBodyUniform}>
        {items.length === 0 ? (
          <div className={styles.emptyBox}>
            <Text size="sm" c="dimmed">
              Chưa có dữ liệu chuyên cần cho kỳ này.
            </Text>
          </div>
        ) : (
          <div className={styles.cleanAttendanceList}>
            {items.slice(0, 5).map((item, index) => {
              const label = item.departmentName ?? item.unitName ?? "-";
              const rate = Math.min(100, Math.max(0, item.attendanceRate));
              const isExcellent = rate >= 95;
              const isGood = rate >= 90;
              const statusLabel = isExcellent
                ? "Xuất sắc"
                : isGood
                ? "Đạt chuẩn"
                : "Cần chú ý";
              const statusPillClass = isExcellent
                ? styles.pillStatusGreen
                : isGood
                ? styles.pillStatusBlue
                : styles.pillStatusAmber;

              return (
                <div key={label} className={styles.cleanAttendanceRow}>
                  <div className={styles.attendanceRowHeader}>
                    <div className={styles.deptInfoGroup}>
                      <span className={styles.deptIndexBadge}>#{index + 1}</span>
                      <span className={styles.deptTitleText}>{label}</span>
                      <span className={`${styles.deptStatusTag} ${statusPillClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className={styles.deptStatsGroup}>
                      <span className={styles.deptDaysFraction}>
                        {item.attendedDays}/{item.workDays} công
                      </span>
                      <span className={styles.deptRatePct}>
                        {rate.toLocaleString("vi-VN")}%
                      </span>
                    </div>
                  </div>

                  <div className={styles.deptProgressTrack}>
                    <div
                      className={`${styles.deptProgressFill} ${statusPillClass}`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** 8. Bảng nhân sự đi muộn cần lưu ý có Micro-Filter */
function ModernTopLateTableCard({
  items,
  onViewEmployee,
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
  onViewEmployee: (employeeId: string) => void;
}) {
  const [filterMode, setFilterMode] = useState<"ALL" | "FREQUENT" | "HIGH_MINUTES">("ALL");

  const filteredItems = useMemo(() => {
    if (filterMode === "FREQUENT") {
      return items.filter((emp) => emp.lateCount >= 3);
    }
    if (filterMode === "HIGH_MINUTES") {
      return items.filter((emp) => emp.totalLateMinutes >= 30);
    }
    return items;
  }, [items, filterMode]);

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.titleWithBadge}>
            <Text className={styles.cardTitle}>Nhân sự đi muộn cần lưu ý</Text>
            {items.length > 0 && (
              <span className={styles.pillBadge}>
                {items.length} nhân sự
              </span>
            )}
          </div>
        </div>

        <Group gap={6}>
          <SegmentedControl
            size="xs"
            value={filterMode}
            onChange={(val) => setFilterMode(val as "ALL" | "FREQUENT" | "HIGH_MINUTES")}
            data={[
              { value: "ALL", label: "Tất cả" },
              { value: "FREQUENT", label: "≥ 3 lần" },
              { value: "HIGH_MINUTES", label: "> 30p" },
            ]}
          />
        </Group>
      </div>

      <div className={styles.cardBodyUniform}>
        {filteredItems.length === 0 ? (
          <div className={styles.emptyBox}>
            <div className={styles.emptyBoxIcon}>
              <IconCheck size={26} />
            </div>
            <Text size="sm" fw={600} c="#166534">
              Không có nhân sự phù hợp điều kiện lọc!
            </Text>
            <Text size="xs" c="dimmed">
              Thử chuyển sang chế độ "Tất cả" để xem danh sách.
            </Text>
          </div>
        ) : (
          <div className={styles.tableModernWrapper}>
            <Table className={styles.tableModern} verticalSpacing="xs" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nhân sự</Table.Th>
                  <Table.Th>Phòng ban</Table.Th>
                  <Table.Th ta="center">Số lần</Table.Th>
                  <Table.Th ta="right">Tổng phút</Table.Th>
                  <Table.Th ta="right" style={{ width: 36 }} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredItems.slice(0, 5).map((item) => (
                  <Table.Tr key={item.employeeId}>
                    <Table.Td>
                      <div className={styles.userModernCell}>
                        <div className={styles.userAvatarInitials}>
                          {getInitials(item.fullName)}
                        </div>
                        <div className={styles.userModernInfo}>
                          <span className={styles.userModernName}>
                            {item.fullName ?? item.employeeId}
                          </span>
                          <span className={styles.userModernCode}>
                            {item.employeeCode ?? "-"}
                          </span>
                        </div>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <span className={styles.deptModernMain}>
                        {item.departmentName ?? item.unitName ?? "-"}
                      </span>
                    </Table.Td>
                    <Table.Td ta="center">
                      <span className={styles.lateCountTagPill}>
                        {formatNumber(item.lateCount)} lần
                      </span>
                    </Table.Td>
                    <Table.Td ta="right">
                      <span className={styles.lateMinutesTagPill}>
                        {formatNumber(item.totalLateMinutes)} phút
                      </span>
                    </Table.Td>
                    <Table.Td ta="right">
                      <button
                        type="button"
                        className={styles.rowDetailBtn}
                        onClick={() => onViewEmployee(item.employeeId)}
                        title="Xem chi tiết nhân sự"
                      >
                        <IconChevronRight size={14} />
                      </button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

/** 9. Chân trang trạng thái đồng bộ hệ thống (Live System Sync Footer) */
function LiveSystemSyncFooter({
  lastSyncTime,
  isRefreshing,
  onRefresh,
}: {
  lastSyncTime: string;
  isRefreshing?: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className={`${styles.systemSyncFooter} ${styles.fadeInItem6}`}>
      <div className={styles.syncFooterLeft}>
        <span className={styles.livePulseRing} />
        <span className={styles.syncStatusText}>
          Dữ liệu đồng bộ lúc <strong>{lastSyncTime}</strong>
        </span>
      </div>

      <div className={styles.syncFooterRight}>
        <button
          type="button"
          className={styles.footerRefreshBtn}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Phím tắt: Alt + R"
        >
          <IconRefresh
            size={13}
            style={{
              animation: isRefreshing ? "spin 1s linear infinite" : "none",
            }}
          />
          <span>{isRefreshing ? "Đang đồng bộ..." : "Làm mới"}</span>
          <span className={styles.footerKbdShortcut}>Alt + R</span>
        </button>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();

  const [selectedUnit, setSelectedUnit] = useState<string>("ALL");
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  });

  const dashboardParams = useMemo(() => ({}), []);
  const { data, isLoading, error, refetch, isFetching } =
    useDashboardSummary(dashboardParams);

  const handleManualRefetch = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      setLastSyncTime(timeStr);
      notifications.show({
        color: "green",
        title: "Đã làm mới dữ liệu",
        message: `Đồng bộ thành công số liệu lúc ${timeStr}.`,
        autoClose: 2500,
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Làm mới thất bại",
        message: "Không thể kết nối máy chủ. Vui lòng thử lại.",
        autoClose: 3000,
      });
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refetch]);

  // Phím tắt toàn cục (Alt + R để làm mới)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + R to refresh
      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        void handleManualRefetch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleManualRefetch]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Chỉ số", "Giá trị"],
      ["Tổng nhân sự", data.totalEmployees.toString()],
      ["Đang làm việc", data.activeEmployees.toString()],
      ["Tuyển mới kỳ này", data.newHiresThisMonth.toString()],
      ["Thôi việc kỳ này", data.terminatedThisMonth.toString()],
      ["Đơn nghỉ phép chờ duyệt", data.pendingLeaveRequests.toString()],
      ["Giải trình công chờ duyệt", data.pendingAttendanceExplanations.toString()],
      ["Đề xuất điều chuyển chờ duyệt", data.pendingMovements.toString()],
      ["Kỳ lương đã chốt", data.payrollHandoff.closedPeriods.toString()],
      ["Phép năm đã dùng", data.attendanceThisMonth.annualLeaveDaysUsed.toString()],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      rows.map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Bao_cao_Dashboard_HRM_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Extract unit options for filtering
  const unitSelectOptions = useMemo(() => {
    if (!data) return [{ value: "ALL", label: "Tất cả đơn vị" }];
    const list = data.employeesByUnit.map((u) => ({
      value: u.label,
      label: u.label,
    }));
    return [{ value: "ALL", label: "Tất cả đơn vị" }, ...list];
  }, [data]);

  // Compute filtered units if a specific unit is selected
  const displayedUnitData = useMemo(() => {
    if (!data) return [];
    if (selectedUnit === "ALL") return data.employeesByUnit;
    return data.employeesByUnit.filter((u) => u.label === selectedUnit);
  }, [data, selectedUnit]);

  const displayedAttendanceData = useMemo(() => {
    if (!data) return [];
    if (selectedUnit === "ALL") return data.attendanceThisMonth.byDepartment;
    return data.attendanceThisMonth.byDepartment.filter(
      (dept) => (dept.unitName ?? dept.departmentName) === selectedUnit,
    );
  }, [data, selectedUnit]);

  const displayedLateData = useMemo(() => {
    if (!data) return [];
    if (selectedUnit === "ALL") return data.attendanceThisMonth.topLateEmployees;
    return data.attendanceThisMonth.topLateEmployees.filter(
      (emp) => emp.unitName === selectedUnit,
    );
  }, [data, selectedUnit]);

  if (isLoading) return <DashboardSkeletonLoader />;
  if (error) return <ErrorState onRetry={() => void refetch()} />;
  if (!data) return <DashboardSkeletonLoader />;

  const pendingTotal =
    data.pendingLeaveRequests +
    data.pendingAttendanceExplanations +
    data.pendingMovements;

  const headerActions = (
    <Group gap="xs" wrap="nowrap" className={styles.headerGroupWrap}>
      {/* Nút Xuất Báo Cáo */}
      <Menu shadow="md" width={180} position="bottom-end">
        <Menu.Target>
          <Tooltip label="Xuất hoặc In báo cáo" withArrow>
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<IconDownload size={14} />}
              className={styles.exportBtn}
            >
              Xuất báo cáo
            </Button>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconPrinter size={15} />}
            onClick={handlePrint}
          >
            In trang / Xuất PDF
          </Menu.Item>
          <Menu.Item
            leftSection={<IconFileSpreadsheet size={15} />}
            onClick={handleExportCSV}
          >
            Tải file CSV tổng hợp
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>



      {/* Nút Làm mới */}
      <Tooltip label="Làm mới dữ liệu (Alt + R)" withArrow>
        <ActionIcon
          variant="default"
          size="md"
          radius="md"
          loading={isFetching || isManualRefreshing}
          onClick={() => void handleManualRefetch()}
          className={styles.refreshBtn}
        >
          <IconRefresh size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Trung tâm điều hành và giám sát dữ liệu nhân sự, chấm công, phê duyệt thời gian thực."
        actions={headerActions}
      />

      <div className={styles.zaloDashboardContainer}>
        {/* 1. Thanh Lọc Đơn vị & Lối tắt điều hướng phân hệ HRM */}
        <EnterpriseQuickBar
          selectedUnit={selectedUnit}
          unitOptions={unitSelectOptions}
          onSelectUnit={setSelectedUnit}
          onNavigate={(path) => navigate(path)}
        />

        {/* 2. Băng chỉ số điều hành HRM */}
        <ExecutiveMetricStrip
          totalEmployees={data.totalEmployees}
          activeEmployees={data.activeEmployees}
          newHires={data.newHiresThisMonth}
          terminated={data.terminatedThisMonth}
          pendingTotal={pendingTotal}
          pendingLeave={data.pendingLeaveRequests}
          pendingAttendance={data.pendingAttendanceExplanations}
          pendingMovements={data.pendingMovements}
          onNavigate={(url) => navigate(url)}
        />

        {/* Khu vực 1: Hai Biểu đồ chính (Tròn và Cột) có nút đổi dạng Bảng & Hover focus */}
        <div className={`${styles.twoColumnGrid} ${styles.fadeInItem3}`}>
          <DonutStructureChart
            title="Cơ cấu nhân sự theo Đơn vị"
            items={displayedUnitData}
            onItemClick={(item) =>
              navigate(
                employeeListUrl({
                  search: item.label,
                  dashboardSlice: "unit",
                }),
              )
            }
          />
          <ColumnStatusChart
            title="Nhân sự theo Trạng thái việc làm"
            items={data.employeesByEmploymentStatus}
            onItemClick={(item) =>
              navigate(
                employeeListUrl({
                  status: item.label,
                  dashboardSlice: "employmentStatus",
                }),
              )
            }
          />
        </div>

        {/* Khu vực 2: Hàng chờ phê duyệt và Vòng đời nhân sự */}
        <div className={`${styles.twoColumnGrid} ${styles.fadeInItem4}`}>
          <ModernPendingQueueCard
            pendingLeave={data.pendingLeaveRequests}
            pendingAttendance={data.pendingAttendanceExplanations}
            pendingMovements={data.pendingMovements}
            onOpen={(route) => navigate(route)}
          />

          <ModernPayrollPreparationCard
            closedPeriods={data.payrollHandoff.closedPeriods}
            latestPeriod={data.payrollHandoff.latestClosedPeriod}
            formatStatus={data.payrollHandoff.formatStatus}
            annualLeaveDaysUsed={data.attendanceThisMonth.annualLeaveDaysUsed}
            leaveBalanceMode={data.attendanceThisMonth.leaveBalanceMode}
            leaveRiskCount={data.leaveExpiryRisks.items.length}
            leaveRiskMessage={data.leaveExpiryRisks.message}
            onOpenAttendance={() => navigate(ROUTES.attendance)}
          />
        </div>

        {/* Khu vực 3: Giám sát Chấm công và Kỷ luật lao động */}
        <div className={`${styles.twoColumnGrid} ${styles.fadeInItem5}`}>
          <ModernAttendanceRatesCard items={displayedAttendanceData} />
          <ModernTopLateTableCard
            items={displayedLateData}
            onViewEmployee={(id) => navigate(`${ROUTES.employees}/${id}`)}
          />
        </div>

        {/* 4. Dải chân trang trạng thái đồng bộ hệ thống Live Sync */}
        <LiveSystemSyncFooter
          lastSyncTime={lastSyncTime}
          isRefreshing={isFetching || isManualRefreshing}
          onRefresh={() => void handleManualRefetch()}
        />
      </div>
    </>
  );
}
