import { Fragment, memo, useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Paper,
  Pagination,
  Progress,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarStats,
  IconDownload,
  IconFilter,
  IconRefresh,
  IconPlayerStop,
  IconTrash,
} from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import { summarizeBccFromDays } from "../../features/attendance/bccSummary";
import {
  compareAttendanceIdentity,
  formatAttendanceCode,
} from "../../features/attendance/timesheetAttendanceCode";
import { downloadTimesheetGridExport } from "../../features/attendance/timesheetApi";
import {
  useAdjustTimesheetDay,
  useSetAutoFullAttendance,
  useTimesheetGrid,
} from "../../features/attendance/useTimesheet";
import { useTimesheetRecomputeJob } from "../../features/attendance/useTimesheetRecomputeJob";
import {
  listTimesheetMonths,
  type TimesheetMonth,
} from "../../features/attendance/timesheetRecomputeRange";
import {
  SYMBOL_OPTIONS,
  type TimesheetGridDay,
  type TimesheetGridRow,
} from "../../features/attendance/timesheetTypes";
import {
  hasTimesheetAttendanceEvent,
  isWeeklyTemplateOffDay,
  timesheetDayDisplayValue,
} from "../../features/attendance/timesheetDayPresentation";
import { formatDate } from "../../shared/utils/date";
import { useEmployees } from "../../features/employees/useEmployees";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { PageHeader } from "../../shared/components/PageHeader";
import { InfoBanner } from "../../shared/components/InfoBanner";

const now = new Date();
const earliestTimesheetYear = 2020;
const latestTimesheetYear = Math.max(
  now.getFullYear() + 4,
  earliestTimesheetYear,
);
const weekdayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Tháng ${index + 1}`,
}));
const yearOptions = Array.from(
  { length: latestTimesheetYear - earliestTimesheetYear + 1 },
  (_, index) => {
    const year = latestTimesheetYear - index;
    return { value: String(year), label: String(year) };
  },
);
const fixedColumns = [
  { key: "autoFull", label: "V", left: 0, width: 34 },
  { key: "number", label: "TT", left: 34, width: 42 },
  { key: "name", label: "Họ và tên", left: 76, width: 210 },
  { key: "code", label: "MCB", left: 286, width: 104 },
] as const;
const dayColumnWidth = 44;
const rowsPerPageOptions = [20, 50, 100].map((value) => ({
  value: String(value),
  label: `${value}/trang`,
}));

type EmployeeFilterOption = {
  value: string;
  label: string;
};
const colorLegendItems = [
  {
    color: "#d9d2e9",
    label: "Phòng ban",
    description: "Dải tiêu đề của từng phòng ban",
  },
  {
    color: "#dbeafe",
    label: "HR sửa tay",
    description: "Ngày đã được HR điều chỉnh thủ công",
  },
  {
    color: "#fee2e2",
    label: "? Giải trình",
    description: "Thiếu chấm công hoặc chưa đủ điều kiện ghi công",
  },
  {
    color: "#ffedd5",
    label: "Đi muộn",
    description: "Đã vượt ngưỡng đi muộn của ca",
  },
  {
    color: "#e5e7eb",
    label: "Chưa phân ca",
    description: "HR cần phân ca trước khi tính BCC",
  },
  {
    color: "#f1f5f9",
    label: "Nghỉ theo ca",
    description: "Ngày OFF rõ ràng từ mẫu Ca tuần",
  },
  {
    color: "#e9ecef",
    label: "CN/ngày nghỉ",
    description: "Chủ nhật hoặc ngày không làm việc",
  },
  {
    color: "#fff3bf",
    label: "Ngày lễ",
    description: "Ngày lễ theo lịch công ty",
  },
  {
    color: "#c7e9b4",
    label: "CT/BP",
    description: "Công tác hoặc biệt phái",
  },
  {
    color: "#fff59d",
    label: "P/L",
    description: "Nghỉ phép hoặc mã lễ, tết",
  },
  {
    color: "#f8bbd0",
    label: "Lđ",
    description: "Lao động nghĩa vụ",
  },
  {
    color: "#ff7875",
    label: "KL",
    description: "Nghỉ không hưởng lương",
  },
  {
    color: "#ffd8a8",
    label: "Ốm/TS/online",
    description: "Ốm, con ốm, thai sản, tai nạn lao động hoặc làm việc online",
  },
  {
    color: "#ffffff",
    label: "+/- công",
    description: "+ là đủ công (máy hoặc cờ mặc định), - là nửa công",
  },
] as const;
const bccTailColumns = [
  { key: "actualWorkDays", label: "Ngày\nlàm việc\nthực tế\n(1)", width: 72 },
  { key: "publicHolidayDays", label: "Nghỉ ngày\nlễ, tết\n(2)", width: 72 },
  { key: "annualLeaveDays", label: "Nghỉ ngày\nphép\n(3)", width: 72 },
  { key: "compensatoryLeaveDays", label: "Nghỉ bù\n(4)", width: 62 },
  {
    key: "paidPersonalLeaveDays",
    label: "Nghỉ việc riêng\ncó lương\n(5)",
    width: 78,
  },
  { key: "companyTripDays", label: "Nghỉ du lịch\n(6)", width: 62 },
  { key: "dutyDays", label: "Ngày\ntrực", width: 58 },
  {
    key: "unpaidLeaveDays",
    label: "Ng.nghỉ\nkhông hưởng\nlương\n(Ẩn)",
    width: 74,
    color: "red.8",
  },
  { key: "socialInsuranceDays", label: "Chế độ\nBHXH\n(Ẩn)", width: 68 },
  {
    key: "totalActualDays",
    label: "Tổng\nngày công\nthực tế\n(7)=(1)+(2)+(3)+(4)+(5)+(6)",
    width: 74,
  },
  {
    key: "annualLeaveUsedToMonth",
    label: "Số ngày phép\nđược sử dụng\nđến tháng",
    width: 82,
  },
  {
    key: "annualLeaveUsedInYear",
    label: "Số ngày phép\nđược sử dụng\ntrong năm",
    width: 82,
  },
  { key: "signature", label: "Ký xác\nnhận", width: 68 },
  { key: "note", label: "Ghi chú\n(Để theo dõi,\nko in cột này)", width: 116 },
] as const;

type BccTailKey = (typeof bccTailColumns)[number]["key"];
const bccTailWidth = bccTailColumns.reduce(
  (total, column) => total + column.width,
  0,
);
const fixedColumnsWidth =
  fixedColumns[fixedColumns.length - 1].left +
  fixedColumns[fixedColumns.length - 1].width;

interface EditingCell {
  day: TimesheetGridDay;
  row: TimesheetGridRow;
}

interface DayMeta {
  day: number;
  label: string;
  isSunday: boolean;
}

interface PreparedTimesheetRow {
  row: TimesheetGridRow;
  daysByNumber: Map<number, TimesheetGridDay>;
}

interface PreparedTimesheetGroup {
  index: number;
  key: string;
  label: string;
  sortKey: string;
  totalRows: number;
  rows: PreparedTimesheetRow[];
  startIndex: number;
}

function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().split("T")[0];
}

function validMonth(value: string | null, fallback: number): number {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? month
    : fallback;
}

function validYear(value: string | null, fallback: number): number {
  const year = Number(value);
  return Number.isInteger(year) &&
    year >= earliestTimesheetYear &&
    year <= latestTimesheetYear
    ? year
    : fallback;
}

function formatTimesheetMonth({ year, month }: TimesheetMonth): string {
  return `Tháng ${String(month).padStart(2, "0")}/${year}`;
}

function recomputeJobStatusLabel(status: string): string {
  switch (status) {
    case "QUEUED":
      return "Đang xếp hàng";
    case "RUNNING":
      return "Đang cập nhật";
    case "SUCCEEDED":
      return "Đã hoàn tất";
    case "CANCELLED":
      return "Đã dừng";
    case "FAILED":
      return "Có lỗi";
    default:
      return status;
  }
}

function recomputeJobStatusColor(
  status: string,
): "blue" | "green" | "orange" | "red" {
  if (status === "SUCCEEDED") return "green";
  if (status === "FAILED") return "red";
  if (status === "CANCELLED") return "orange";
  return "blue";
}

function makeDayMeta(year: number, month: number, day: number): DayMeta {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { day, label: weekdayLabels[weekday], isSunday: weekday === 0 };
}

function fixedStyle(left: number, width: number, header = false) {
  return {
    position: "sticky" as const,
    left,
    minWidth: width,
    width,
    zIndex: header ? 4 : 2,
    background: header ? "#e6f2df" : "var(--mantine-color-body)",
    boxShadow:
      left === fixedColumns[fixedColumns.length - 1].left
        ? "2px 0 0 var(--mantine-color-gray-4)"
        : undefined,
  };
}

function departmentGroupLabel(row: TimesheetGridRow): string {
  return (
    [row.unitName, row.departmentName].filter(Boolean).join(" · ") ||
    "Chưa phân đơn vị / phòng ban"
  );
}

function organizationNameKey(
  ...parts: Array<string | null | undefined>
): string {
  return parts
    .map((part) =>
      (part ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replaceAll("đ", "d")
        .replaceAll("Đ", "D")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase(),
    )
    .join("\u0000");
}

function surfaceForSymbol(symbol: string): string | undefined {
  const symbols = symbol.split(";");
  if (symbols.includes("KL")) return "#ff7875";
  if (symbols.some((item) => item === "P" || item === "L")) return "#fff59d";
  if (symbols.some((item) => item === "Lđ" || item === "LĐ")) {
    return "#f8bbd0";
  }
  if (symbols.some((item) => item === "CT" || item === "BP")) return "#c7e9b4";
  if (symbols.some((item) => ["Ô", "Cô", "TS", "TN", "O"].includes(item))) {
    return "#ffd8a8";
  }
  return undefined;
}

function TimesheetColorLegend() {
  return (
    <Stack gap={3} pb={2} style={{ flex: 1, minWidth: 360 }}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        Chú giải màu ô
      </Text>
      <Group gap="xs" wrap="wrap">
        {colorLegendItems.map((item) => (
          <Group key={item.label} gap={4} wrap="nowrap">
            <span
              aria-hidden
              style={{
                background: item.color,
                border: "1px solid var(--mantine-color-gray-4)",
                borderRadius: 3,
                display: "block",
                flex: "0 0 auto",
                height: 11,
                width: 11,
              }}
            />
            <Text fz={10} lh={1.2} c="dimmed" title={item.description}>
              {item.label}
            </Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}

function cellDescription(
  day: TimesheetGridDay | undefined,
  attendanceAutoFullDay = false,
): string {
  if (!day) return "Chưa tạo dữ liệu ngày công";
  const weeklyTemplateOff = isWeeklyTemplateOffDay(day);
  const weeklyTemplateWork =
    day.source === "WEEKLY_TEMPLATE_EMPLOYEE" && !weeklyTemplateOff;
  return [
    day.isDerived ? "Dữ liệu xem trước, chưa lưu bảng công" : null,
    attendanceAutoFullDay &&
    day.isWorkingDay &&
    !day.hasAdjustment &&
    !day.isLocked
      ? "Đủ công mặc định"
      : null,
    day.holidayName,
    day.source === "HOLIDAY_UNPAID" ? "Ngày lễ không lương" : null,
    day.source === "UNASSIGNED" ? "Chưa phân ca — chưa tính công" : null,
    weeklyTemplateOff ? "Nghỉ theo ca tuần" : null,
    weeklyTemplateWork ? "Theo ca tuần" : null,
    day.firstPunch && day.lastPunch
      ? `${day.firstPunch}–${day.lastPunch}`
      : null,
    day.lateMinutes > 0 ? `Muộn ${day.lateMinutes}'` : null,
    day.earlyLeaveMinutes > 0 ? `Về sớm ${day.earlyLeaveMinutes}'` : null,
    day.needsExplanation && hasTimesheetAttendanceEvent(day)
      ? "Chờ giải trình"
      : null,
    day.hasAdjustment ? "HR đã sửa tay" : null,
    day.isLocked ? "Đã chốt kỳ" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function bccTailValue(row: TimesheetGridRow, key: BccTailKey): number | string {
  const bcc = row.summary.bcc ?? summarizeBccFromDays(row.days);
  const values: Record<BccTailKey, number | string> = {
    actualWorkDays: bcc.actualWorkDays,
    publicHolidayDays: bcc.publicHolidayDays,
    annualLeaveDays: bcc.annualLeaveDays,
    compensatoryLeaveDays: bcc.compensatoryLeaveDays,
    paidPersonalLeaveDays: bcc.paidPersonalLeaveDays,
    companyTripDays: bcc.companyTripDays,
    dutyDays: bcc.dutyDays,
    unpaidLeaveDays: bcc.unpaidLeaveDays,
    socialInsuranceDays: bcc.socialInsuranceDays,
    totalActualDays: bcc.totalActualDays,
    annualLeaveUsedToMonth: row.summary.annualLeaveUsedToMonth || "",
    annualLeaveUsedInYear: row.summary.annualLeaveUsedInYear || "",
    signature: "",
    note: "",
  };
  return values[key];
}

function bccTailLabel(
  column: (typeof bccTailColumns)[number],
  month: number,
  year: number,
): string {
  if (column.key === "annualLeaveUsedToMonth") {
    return `Số ngày phép\nđược sử dụng\nđến tháng\n${month}/${year}`;
  }
  if (column.key === "annualLeaveUsedInYear") {
    return `Số ngày phép\nđược sử dụng\ntrong năm\n${year}`;
  }
  return column.label;
}

const TimesheetDataRow = memo(function TimesheetDataRow({
  item,
  employeeNumber,
  dayMetas,
  canEdit,
  onOpenCell,
  onOpenAutoFullAttendance,
}: {
  item: PreparedTimesheetRow;
  employeeNumber: number;
  dayMetas: DayMeta[];
  canEdit: boolean;
  onOpenCell: (row: TimesheetGridRow, day: TimesheetGridDay) => void;
  onOpenAutoFullAttendance: (row: TimesheetGridRow) => void;
}) {
  const { row, daysByNumber } = item;

  return (
    <Table.Tr>
      <Table.Td
        style={{
          ...fixedStyle(fixedColumns[0].left, fixedColumns[0].width),
          textAlign: "center",
        }}
        title={
          row.attendanceAutoFullDay
            ? "Đã đánh dấu đủ công mặc định"
            : "Chưa đánh dấu đủ công mặc định"
        }
      >
        {row.attendanceAutoFullDay ? (
          <Text
            aria-label={`${row.fullName} đã được đánh dấu đủ công mặc định`}
            c="green.7"
            fw={800}
            size="sm"
          >
            V
          </Text>
        ) : null}
      </Table.Td>
      <Table.Td
        style={{
          ...fixedStyle(fixedColumns[1].left, fixedColumns[1].width),
          textAlign: "center",
        }}
      >
        {employeeNumber}
      </Table.Td>
      <Table.Td style={fixedStyle(fixedColumns[2].left, fixedColumns[2].width)}>
        <UnstyledButton
          aria-label={`Thiết lập đủ công mặc định cho ${row.fullName}`}
          title={`Mở thiết lập đủ công mặc định cho ${row.fullName}`}
          onClick={() => onOpenAutoFullAttendance(row)}
          style={{
            display: "block",
            minWidth: 0,
            textAlign: "left",
            width: "100%",
          }}
        >
          <Text size="xs" fw={600} truncate="end" td="underline">
            {row.fullName}
          </Text>
        </UnstyledButton>
      </Table.Td>
      <Table.Td style={fixedStyle(fixedColumns[3].left, fixedColumns[3].width)}>
        <Text size="xs" fw={600} title="Mã chấm công BioTime/MCB">
          {formatAttendanceCode(row.attendanceCode)}
        </Text>
      </Table.Td>
      {dayMetas.map((meta) => {
        const day = daysByNumber.get(meta.day);
        const label = timesheetDayDisplayValue(day);
        const weeklyTemplateOff = isWeeklyTemplateOffDay(day);
        const hasExplanationEvent = Boolean(
          day?.needsExplanation && hasTimesheetAttendanceEvent(day),
        );
        const background =
          weeklyTemplateOff
            ? "#f1f5f9"
            : day?.source === "UNASSIGNED"
            ? "#e5e7eb"
            : !day?.isWorkingDay
              ? day?.holidayName
                ? "#fff3bf"
                : meta.isSunday
                  ? "#e9ecef"
                  : "#f8f9fa"
              : (surfaceForSymbol(label) ??
                (meta.isSunday
                  ? "#f1f3f5"
                  : day?.hasAdjustment
                    ? "#dbeafe"
                    : hasExplanationEvent
                      ? "#fee2e2"
                      : (day?.lateMinutes ?? 0) > 0
                        ? "#ffedd5"
                        : undefined));
        const isEditable =
          canEdit && day !== undefined && !day.isLocked && !day.isDerived;

        return (
          <Table.Td
            key={meta.day}
            title={cellDescription(day, Boolean(row.attendanceAutoFullDay))}
            style={{
              minWidth: dayColumnWidth,
              width: dayColumnWidth,
              textAlign: "center",
              background,
              cursor: isEditable ? "pointer" : "default",
            }}
            onClick={() => isEditable && day && onOpenCell(row, day)}
          >
            <Text
              fw={label ? 700 : undefined}
              size="xs"
              c={label.includes("KL") ? "red.9" : undefined}
            >
              {label}
            </Text>
          </Table.Td>
        );
      })}
      {bccTailColumns.map((column) => {
        const value = bccTailValue(row, column.key);
        return (
          <Table.Td
            key={column.key}
            style={{ minWidth: column.width, textAlign: "center" }}
          >
            <Text
              fw={column.key === "totalActualDays" ? 700 : undefined}
              size="xs"
            >
              {value}
            </Text>
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
});

export function TimesheetGridPage() {
  const { can } = useAuth();
  const [searchParams] = useSearchParams();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);
  const canExport = can(HR_PERMISSIONS.ATTENDANCE_EXPORT);
  const [month, setMonth] = useState(() =>
    validMonth(searchParams.get("month"), now.getMonth() + 1),
  );
  const [year, setYear] = useState(() =>
    validYear(searchParams.get("year"), now.getFullYear()),
  );
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [unitIds, setUnitIds] = useState<string[]>(() => {
    const unitId = searchParams.get("unitId")?.trim();
    return unitId ? [unitId] : [];
  });
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeFilterOption | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [scopeModalOpened, setScopeModalOpened] = useState(false);
  const [draftDepartmentIds, setDraftDepartmentIds] = useState<string[]>([]);
  const [draftUnitIds, setDraftUnitIds] = useState<string[]>([]);
  const [recomputeRangeModalOpened, setRecomputeRangeModalOpened] =
    useState(false);
  const [recomputeRangeStart, setRecomputeRangeStart] =
    useState<TimesheetMonth>({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });
  const [recomputeRangeEnd, setRecomputeRangeEnd] = useState<TimesheetMonth>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [runningRecomputeScopeLabel, setRunningRecomputeScopeLabel] = useState<
    string | null
  >(null);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [autoFullAttendanceRow, setAutoFullAttendanceRow] =
    useState<TimesheetGridRow | null>(null);
  const [autoFullAttendanceEnabled, setAutoFullAttendanceEnabled] =
    useState(false);
  const [editSymbol, setEditSymbol] = useState<string | null>(null);
  const [editPortion, setEditPortion] = useState(1);
  const [editReason, setEditReason] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const tableViewportRef = useRef<HTMLDivElement>(null);
  const tableScrollPositionRef = useRef({ left: 0, top: 0 });

  const departmentsQuery = useDepartmentsSelect();
  const unitsQuery = useUnitsSelect();
  const employeeSearchQuery = useEmployees({
    search: employeeSearch.trim() || undefined,
    page: 1,
    pageSize: 20,
  });
  const query = useMemo(
    () => ({
      month,
      year,
      employeeId: employeeId ?? undefined,
      departmentIds: departmentIds.length ? departmentIds : undefined,
      unitIds: unitIds.length ? unitIds : undefined,
    }),
    [departmentIds, employeeId, month, unitIds, year],
  );
  const gridQuery = useTimesheetGrid(query);
  const isGridPlaceholderData = gridQuery.isPlaceholderData;
  const isGridScopeLoading = gridQuery.isLoading || isGridPlaceholderData;
  const adjustDay = useAdjustTimesheetDay();
  const recomputeJob = useTimesheetRecomputeJob();
  const autoFullAttendance = useSetAutoFullAttendance();
  const rows = useMemo(
    () => (isGridPlaceholderData ? [] : (gridQuery.data?.rows ?? [])),
    [gridQuery.data?.rows, isGridPlaceholderData],
  );
  const rememberTimesheetScroll = useCallback(() => {
    const viewport = tableViewportRef.current;
    if (!viewport) return;
    tableScrollPositionRef.current = {
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
  }, []);
  const restoreTimesheetScroll = useCallback(() => {
    // invalidateQueries hoàn tất trước khi React kịp commit DOM mới. Chờ hai
    // frame để giữ nguyên ngày/hàng HR đang xem thay vì nhảy ngang khi tick.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const viewport = tableViewportRef.current;
        if (!viewport) return;
        viewport.scrollTo(tableScrollPositionRef.current);
      });
    });
  }, []);
  const dayMetas = useMemo(
    () =>
      Array.from(
        {
          length: isGridPlaceholderData
            ? 0
            : (gridQuery.data?.daysInMonth ?? 31),
        },
        (_, index) => makeDayMeta(year, month, index + 1),
      ),
    [gridQuery.data?.daysInMonth, isGridPlaceholderData, month, year],
  );

  const unitNameById = useMemo(
    () => new Map((unitsQuery.data ?? []).map((unit) => [unit.id, unit.name])),
    [unitsQuery.data],
  );
  const unitCodeById = useMemo(
    () => new Map((unitsQuery.data ?? []).map((unit) => [unit.id, unit.code])),
    [unitsQuery.data],
  );
  const unitCodeByName = useMemo(
    () =>
      new Map(
        (unitsQuery.data ?? []).map((unit) => [
          organizationNameKey(unit.name),
          unit.code,
        ]),
      ),
    [unitsQuery.data],
  );
  const departmentCodeById = useMemo(
    () =>
      new Map(
        (departmentsQuery.data ?? []).map((department) => [
          department.id,
          department.code,
        ]),
      ),
    [departmentsQuery.data],
  );
  const departmentCodeByOrganizationName = useMemo(
    () =>
      new Map(
        (departmentsQuery.data ?? []).map((department) => [
          organizationNameKey(
            unitNameById.get(department.unitId),
            department.name,
          ),
          department.code,
        ]),
      ),
    [departmentsQuery.data, unitNameById],
  );
  const departmentUnitIdById = useMemo(
    () =>
      new Map(
        (departmentsQuery.data ?? []).map((department) => [
          department.id,
          department.unitId,
        ]),
      ),
    [departmentsQuery.data],
  );
  const unitOptions = useMemo(
    () =>
      (unitsQuery.data ?? []).map((unit) => ({
        value: unit.id,
        label: unit.shortName ? `${unit.name} (${unit.shortName})` : unit.name,
      })),
    [unitsQuery.data],
  );
  const visibleDepartmentOptions = useMemo(() => {
    const selectedUnitIds = new Set(draftUnitIds);
    const departments = draftUnitIds.length
      ? (departmentsQuery.data ?? []).filter((department) =>
          selectedUnitIds.has(department.unitId),
        )
      : (departmentsQuery.data ?? []);

    return departments.map((department) => ({
      value: department.id,
      label: unitNameById.get(department.unitId)
        ? `${department.name} (${unitNameById.get(department.unitId)})`
        : department.name,
    }));
  }, [departmentsQuery.data, draftUnitIds, unitNameById]);
  const employeeOptions = useMemo<EmployeeFilterOption[]>(() => {
    const options = (employeeSearchQuery.data?.data ?? []).map((employee) => ({
      value: employee.id,
      label: `${employee.fullName} · ${
        employee.biotimeEmployeeCode?.trim() || "Chưa gán mã chấm công"
      }`,
    }));

    if (
      selectedEmployee &&
      !options.some((option) => option.value === selectedEmployee.value)
    ) {
      return [selectedEmployee, ...options];
    }
    return options;
  }, [employeeSearchQuery.data?.data, selectedEmployee]);
  const preparedRows = useMemo<PreparedTimesheetRow[]>(
    () =>
      rows.map((row) => ({
        row,
        daysByNumber: new Map(row.days.map((day) => [day.day, day])),
      })),
    [rows],
  );
  const groupedRows = useMemo<PreparedTimesheetGroup[]>(() => {
    const groups = new Map<
      string,
      Omit<PreparedTimesheetGroup, "index" | "startIndex" | "totalRows">
    >();

    for (const item of preparedRows) {
      const organizationKey = organizationNameKey(
        item.row.unitName,
        item.row.departmentName,
      );
      const departmentCode =
        item.row.departmentCode ??
        (item.row.departmentId
          ? departmentCodeById.get(item.row.departmentId)
          : undefined) ??
        departmentCodeByOrganizationName.get(organizationKey);
      const unitCode =
        item.row.unitCode ??
        (item.row.unitId ? unitCodeById.get(item.row.unitId) : undefined) ??
        unitCodeByName.get(organizationNameKey(item.row.unitName));
      const label = departmentGroupLabel(item.row);
      const key =
        item.row.departmentId ??
        departmentCode ??
        (organizationKey === "\u0000" ? "unassigned" : organizationKey);
      // Theo đúng thứ tự danh mục: đơn vị trước, rồi tới phòng ban
      // (DV001_01 → DV001_07, DV002_01 → ...). Dữ liệu máy chấm công cũ
      // có thể không trả unitId, khi đó suy ra đơn vị từ tiền tố mã phòng ban.
      const unitSortCode =
        unitCode ?? departmentCode?.split("_", 1)[0] ?? "ZZZ";
      const sortKey = [unitSortCode, departmentCode ?? "ZZZ", label].join(
        "\u0000",
      );
      const group = groups.get(key);

      if (group) {
        group.rows.push(item);
      } else {
        groups.set(key, { key, label, sortKey, rows: [item] });
      }
    }

    return [...groups.values()]
      .sort((left, right) =>
        left.sortKey.localeCompare(right.sortKey, "vi", {
          numeric: true,
          sensitivity: "base",
        }),
      )
      .map((group, index, sortedGroups) => {
        const rows = [...group.rows].sort((left, right) =>
          compareAttendanceIdentity(left.row, right.row),
        );
        const startIndex = sortedGroups
          .slice(0, index)
          .reduce(
            (total, previousGroup) => total + previousGroup.rows.length,
            0,
          );
        const preparedGroup = {
          ...group,
          index: index + 1,
          rows,
          startIndex,
          totalRows: rows.length,
        };
        return preparedGroup;
      });
  }, [
    departmentCodeById,
    departmentCodeByOrganizationName,
    preparedRows,
    unitCodeById,
    unitCodeByName,
  ]);
  const totalPages = Math.max(1, Math.ceil(preparedRows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pagedGroups = useMemo(() => {
    const pageStart = (currentPage - 1) * rowsPerPage;
    const pageEnd = pageStart + rowsPerPage;

    return groupedRows.flatMap((group) => {
      const groupStart = group.startIndex;

      const start = Math.max(0, pageStart - groupStart);
      const end = Math.min(group.rows.length, pageEnd - groupStart);
      if (start >= end) return [];
      return [
        {
          ...group,
          // Preserve the global TT offset when a page begins mid-group.
          startIndex: groupStart + start,
          rows: group.rows.slice(start, end),
        },
      ];
    });
  }, [currentPage, groupedRows, rowsPerPage]);
  const pageStartRecord = preparedRows.length
    ? (currentPage - 1) * rowsPerPage + 1
    : 0;
  const pageEndRecord = Math.min(
    currentPage * rowsPerPage,
    preparedRows.length,
  );
  const scopeLabel = useMemo(() => {
    if (!unitIds.length && !departmentIds.length) return "Toàn công ty";
    return [
      unitIds.length ? `${unitIds.length} công ty/đơn vị` : null,
      departmentIds.length ? `${departmentIds.length} phòng ban` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [departmentIds.length, unitIds.length]);

  const recomputeScopeLabel = useMemo(() => {
    if (!employeeId) return scopeLabel;
    return `${scopeLabel} · ${selectedEmployee?.label ?? "1 nhân sự"}`;
  }, [employeeId, scopeLabel, selectedEmployee]);
  const recomputeRangePreview = useMemo(() => {
    try {
      return {
        months: listTimesheetMonths(recomputeRangeStart, recomputeRangeEnd),
        error: null as string | null,
      };
    } catch (error) {
      return {
        months: [] as TimesheetMonth[],
        error:
          error instanceof Error ? error.message : "Dải kỳ công không hợp lệ.",
      };
    }
  }, [recomputeRangeEnd, recomputeRangeStart]);

  function openRecomputeRangeModal() {
    if (recomputeJob.isRunning || isGridScopeLoading) return;
    const currentMonth = { month, year };
    setRecomputeRangeStart(currentMonth);
    setRecomputeRangeEnd(currentMonth);
    setRecomputeRangeModalOpened(true);
  }

  function snapshotRecomputeScope() {
    return {
      employeeId: employeeId ?? undefined,
      departmentIds: departmentIds.length ? [...departmentIds] : undefined,
      unitIds: unitIds.length ? [...unitIds] : undefined,
    };
  }
  const openCell = useCallback(
    (row: TimesheetGridRow, day: TimesheetGridDay) => {
      if (
        !canEdit ||
        isGridScopeLoading ||
        recomputeJob.isRunning ||
        day.isLocked ||
        day.isDerived
      )
        return;
      setEditing({ row, day });
      setEditSymbol(day.displaySymbol.split(";")[0] || null);
      setEditPortion(day.paidDays || 1);
      setEditReason("");
    },
    [canEdit, isGridScopeLoading, recomputeJob.isRunning],
  );

  const openAutoFullAttendanceSettings = useCallback(
    (row: TimesheetGridRow) => {
      if (isGridScopeLoading || recomputeJob.isRunning) return;
      setAutoFullAttendanceRow(row);
      setAutoFullAttendanceEnabled(Boolean(row.attendanceAutoFullDay));
    },
    [isGridScopeLoading, recomputeJob.isRunning],
  );

  function openScopeModal() {
    setDraftUnitIds(unitIds);
    setDraftDepartmentIds(
      restrictDepartmentsToDraftUnits(departmentIds, unitIds),
    );
    setScopeModalOpened(true);
  }

  /** Một phòng ban chỉ hợp lệ trong các đơn vị đang chọn. Khi không chọn đơn
   * vị, cho phép HR lọc trực tiếp theo phòng ban trên toàn công ty. */
  function restrictDepartmentsToDraftUnits(
    ids: string[],
    selectedUnitIds: string[],
  ) {
    if (!selectedUnitIds.length || !departmentsQuery.data) return ids;

    const selectedUnitIdSet = new Set(selectedUnitIds);
    return ids.filter((departmentId) =>
      selectedUnitIdSet.has(departmentUnitIdById.get(departmentId) ?? ""),
    );
  }

  function toggleDraftUnitSelection(unitId: string) {
    const nextUnitIds = draftUnitIds.includes(unitId)
      ? draftUnitIds.filter((id) => id !== unitId)
      : [...draftUnitIds, unitId];

    setDraftUnitIds(nextUnitIds);
    setDraftDepartmentIds((currentDepartmentIds) =>
      restrictDepartmentsToDraftUnits(currentDepartmentIds, nextUnitIds),
    );
  }

  function toggleDraftSelection(
    id: string,
    selected: string[],
    setSelected: (value: string[]) => void,
  ) {
    setSelected(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  }

  async function handleSaveCell() {
    if (!editing || isGridScopeLoading || recomputeJob.isRunning) return;
    if (editReason.trim().length < 3) {
      notifications.show({
        color: "red",
        title: "Thiếu lý do",
        message: "Sửa tay ô chấm công bắt buộc phải nêu lý do.",
      });
      return;
    }
    try {
      await adjustDay.mutateAsync({
        id: editing.day.id,
        payload: {
          segments: editSymbol
            ? [{ symbol: editSymbol, portion: editPortion }]
            : [],
          reason: editReason.trim(),
        },
      });
      notifications.show({
        color: "green",
        title: "Đã lưu ô chấm công",
        message:
          "Thay đổi được lưu lịch sử và không bị cập nhật tự động ghi đè.",
      });
      setEditing(null);
    } catch {
      notifications.show({
        color: "red",
        title: "Không lưu được ô chấm công",
        message: "Kiểm tra lại ký hiệu, số công và trạng thái chốt kỳ.",
      });
    }
  }

  async function handleStartRecomputeRange() {
    if (
      !recomputeRangePreview.months.length ||
      isGridScopeLoading ||
      recomputeJob.isRunning
    )
      return;

    const start = recomputeRangeStart;
    const end = recomputeRangeEnd;
    const rangeLabel =
      start.year === end.year && start.month === end.month
        ? formatTimesheetMonth(start)
        : `${formatTimesheetMonth(start)} – ${formatTimesheetMonth(end)}`;
    setRecomputeRangeModalOpened(false);
    setRunningRecomputeScopeLabel(recomputeScopeLabel);
    rememberTimesheetScroll();

    try {
      const job = await recomputeJob.start({
        start,
        end,
        scope: snapshotRecomputeScope(),
      });
      const eligibleMonthCount =
        job.eligibleMonths ?? job.sourceMonths?.length ?? job.totalMonths;
      const requestedSourceCoverage = `${eligibleMonthCount}/${job.totalMonths} tháng có dữ liệu nguồn`;
      const sourceCoverage = `${job.completedMonths}/${eligibleMonthCount} tháng có dữ liệu nguồn đã xử lý (${requestedSourceCoverage}).`;
      const noSourceCoverage = job.skippedNoSourceMonths
        ? ` ${job.skippedNoSourceMonths} tháng không có dữ liệu nguồn vẫn chỉ để xem.`
        : "";
      const protectedDays =
        job.skippedLocked + job.skippedAdjusted + job.skippedClosed;

      if (job.status === "SUCCEEDED") {
        notifications.show({
          color: "green",
          title: `Đã cập nhật bảng công: ${rangeLabel}`,
          message:
            protectedDays > 0
              ? `Đã xử lý ${job.processed} ô ngày công. ${sourceCoverage}${noSourceCoverage} Giữ nguyên ${job.skippedLocked + job.skippedClosed} ngày đã khóa/chốt và ${job.skippedAdjusted} ngày HR sửa tay.`
              : `Đã xử lý ${job.processed} ô ngày công. ${sourceCoverage}${noSourceCoverage}`,
        });
      } else if (job.status === "CANCELLED") {
        notifications.show({
          color: "orange",
          title: "Đã dừng cập nhật bảng công",
          message: `Đã hoàn tất ${sourceCoverage}${noSourceCoverage} Các dữ liệu đã hoàn tất vẫn được giữ.`,
        });
      } else {
        notifications.show({
          color: "red",
          title: "Không tính lại được",
          message: job.errorMessage || "Vui lòng thử lại sau.",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Vui lòng thử lại sau.";
      notifications.show({
        color: "red",
        title: "Không thể tạo job cập nhật bảng công",
        message,
      });
    } finally {
      // The job hook invalidates once at terminal state. Two animation frames in
      // restoreTimesheetScroll retain the HR viewport if that refetch swaps rows.
      restoreTimesheetScroll();
    }
  }

  async function handleCancelRecomputeJob() {
    try {
      const job = await recomputeJob.cancel();
      if (!job) return;
      notifications.show({
        color: "blue",
        title: "Đã gửi yêu cầu dừng",
        message:
          "Máy chủ sẽ dừng an toàn sau đơn vị xử lý hiện tại; các tháng đã hoàn tất vẫn được giữ.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Chưa gửi được yêu cầu dừng",
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Vui lòng thử lại sau.",
      });
    }
  }

  async function handleSaveAutoFullAttendance() {
    if (
      !canEdit ||
      !autoFullAttendanceRow ||
      isGridScopeLoading ||
      recomputeJob.isRunning
    )
      return;
    const row = autoFullAttendanceRow;
    const enabled = autoFullAttendanceEnabled;
    rememberTimesheetScroll();
    try {
      const result = await autoFullAttendance.mutateAsync({
        employeeId: row.employeeId,
        payload: {
          enabled,
          fromDate: `${year}-${String(month).padStart(2, "0")}-01`,
          toDate: lastDayOfMonth(year, month),
        },
      });
      notifications.show({
        color: "green",
        title: enabled ? "Đã bật đủ công mặc định" : "Đã tắt đủ công mặc định",
        message: enabled
          ? `${row.fullName} được tự đủ công ở các ngày làm việc của kỳ ${month}/${year}; Chủ nhật vẫn là ngày nghỉ.`
          : `${row.fullName} đã khôi phục ${result.recompute.processed} ô bảng công trước khi bật đủ công mặc định. Ô HR sửa tay hoặc kỳ đã chốt vẫn được giữ nguyên.`,
      });
      setAutoFullAttendanceRow(null);
      if (
        result.recompute.skippedLocked + result.recompute.skippedAdjusted >
        0
      ) {
        notifications.show({
          color: "blue",
          title: "Giữ nguyên quyết định đã có",
          message: `Không thay đổi ${result.recompute.skippedLocked} ngày đã chốt và ${result.recompute.skippedAdjusted} ngày HR đã sửa tay.`,
        });
      }
    } catch {
      notifications.show({
        color: "red",
        title: "Không lưu được đủ công mặc định",
        message: "Kiểm tra lại quyền HR và thử lại sau.",
      });
    } finally {
      restoreTimesheetScroll();
    }
  }

  async function handleExport() {
    if (isGridScopeLoading || isExporting) return;
    setIsExporting(true);
    try {
      const result = await downloadTimesheetGridExport(query);
      if (result.status === "cancelled") {
        return;
      }
      if (result.status === "unsupported") {
        notifications.show({
          color: "orange",
          title: "Chưa thể chọn nơi lưu",
          message:
            "Hãy mở Hacom HRM bằng Chrome hoặc Microsoft Edge để chọn thư mục và tên file Excel.",
        });
        return;
      }
      notifications.show({
        color: "green",
        title: "Đã lưu Excel",
        message: `Đã lưu ${result.filename} theo đúng phạm vi đang chọn.`,
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Không xuất được Excel",
        message: "Vui lòng thử lại sau hoặc kiểm tra quyền xuất dữ liệu.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        compact
        title="Bảng chấm công tháng"
        subtitle="Theo dõi theo công ty, phòng ban và nhân viên; nhấn họ tên để thiết lập đủ công mặc định."
        actions={
          canEdit || canExport ? (
            <Group gap="xs">
              {canExport ? (
                <Button
                  size="sm"
                  variant="default"
                  leftSection={<IconDownload size={16} />}
                  loading={isExporting}
                  disabled={isGridScopeLoading || isExporting}
                  onClick={() => void handleExport()}
                >
                  Xuất Excel
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  size="sm"
                  leftSection={<IconRefresh size={16} />}
                  loading={recomputeJob.isRunning}
                  disabled={
                    isGridScopeLoading ||
                    autoFullAttendance.isPending ||
                    recomputeJob.isRunning
                  }
                  onClick={openRecomputeRangeModal}
                >
                  Cập nhật bảng công
                </Button>
              ) : null}
            </Group>
          ) : null
        }
      />

      <Stack gap="xs">
        <InfoBanner title="Quy tắc tính công và ký hiệu trên bảng" collapsible>
          <Text size="sm" inherit>
            Giờ hành chính <b>08:00–17:00</b>; check-in <b>quá 10 phút</b> mới
            tính đi muộn. Ngưỡng thực tế lấy theo từng ca. Thứ Bảy làm buổi sáng
            <b> 08:00–12:00</b>; Chủ nhật luôn là <b> ngày nghỉ</b>, không cảnh
            báo muộn hay thiếu chấm công. Nhân sự chưa được phân ca hiển thị
            riêng và chưa tự tính công. Nhấn vào <b>họ tên</b> để thiết lập{" "}
            <b>Đủ công mặc định</b> theo từng người đặc thù; khi bật, bảng hiển
            thị
            <b> V</b> ở cột đầu bảng. Bỏ tick sẽ khôi phục đúng bảng công trước
            khi bật. Khi chọn tháng cũ, hệ thống xét đúng phân công hiệu lực của
            tháng đó, kể cả nhân sự đã nghỉ hoặc chuyển đơn vị sau này.
          </Text>
        </InfoBanner>

        {recomputeJob.status !== "IDLE" ? (
          <Paper withBorder radius="sm" p="sm">
            <Stack gap="xs">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Group gap="xs" wrap="nowrap">
                  <IconCalendarStats size={18} />
                  <div>
                    <Text size="sm" fw={700}>
                      Cập nhật bảng công nền
                    </Text>
                    <Text size="xs" c="dimmed">
                      {runningRecomputeScopeLabel ??
                        "Đang khôi phục trạng thái job đã tạo trước đó."}
                    </Text>
                  </div>
                </Group>
                <Badge color={recomputeJobStatusColor(recomputeJob.status)}>
                  {recomputeJobStatusLabel(recomputeJob.status)}
                </Badge>
              </Group>

              <Progress
                value={
                  typeof recomputeJob.progressPercent === "number"
                    ? Math.max(0, Math.min(100, recomputeJob.progressPercent))
                    : recomputeJob.status === "SUCCEEDED"
                      ? 100
                      : 0
                }
                animated={recomputeJob.isRunning}
                aria-label="Tiến độ cập nhật bảng công"
              />
              <Group justify="space-between" gap="xs" wrap="wrap">
                <Text size="xs" c="dimmed">
                  Đã xử lý {recomputeJob.completedMonths}/
                  {recomputeJob.eligibleMonths ??
                    recomputeJob.sourceMonths?.length ??
                    recomputeJob.totalMonths}{" "}
                  tháng có dữ liệu nguồn
                  {recomputeJob.eligibleMonths !== null ||
                  recomputeJob.sourceMonths !== null
                    ? ` (${recomputeJob.eligibleMonths ?? recomputeJob.sourceMonths?.length ?? 0}/${recomputeJob.totalMonths} kỳ được yêu cầu)`
                    : ""}
                </Text>
                {recomputeJob.completedBatches !== null &&
                recomputeJob.totalBatches !== null ? (
                  <Text size="xs" c="dimmed">
                    {recomputeJob.completedBatches}/{recomputeJob.totalBatches}{" "}
                    lô
                  </Text>
                ) : null}
                {recomputeJob.estimatedCells !== null ? (
                  <Text size="xs" c="dimmed">
                    Ước tính{" "}
                    {recomputeJob.estimatedCells.toLocaleString("vi-VN")} ô-ngày
                    cần tính
                  </Text>
                ) : null}
              </Group>
              <Text size="xs" c="dimmed">
                {recomputeJob.currentMonth
                  ? `Đang xử lý ${formatTimesheetMonth(recomputeJob.currentMonth)}. `
                  : ""}
                {(recomputeJob.eligibleEmployees ?? recomputeJob.totalEmployees)
                  ? `${recomputeJob.eligibleEmployees ?? recomputeJob.totalEmployees} nhân sự thuộc phạm vi cần tính. `
                  : ""}
                {recomputeJob.skippedNoSourceMonths !== null
                  ? `${recomputeJob.skippedNoSourceMonths} tháng không có dữ liệu nguồn chỉ để xem.`
                  : "Máy chủ sẽ xác nhận số tháng có dữ liệu nguồn."}
              </Text>
              <Alert color="blue" variant="light" p="xs">
                Chỉ các tháng có dữ liệu nguồn mới được xử lý. Tháng không có dữ
                liệu nguồn vẫn chỉ để xem, không tự tạo thiếu công. Ngày đã
                chốt/ khóa và ngày HR sửa tay luôn được giữ nguyên.
              </Alert>
              {recomputeJob.cancellationRequested ? (
                <Text size="xs" c="orange.8">
                  Đã gửi yêu cầu dừng; máy chủ sẽ dừng an toàn sau đơn vị xử lý
                  hiện tại. Các tháng đã hoàn tất vẫn được giữ.
                </Text>
              ) : null}
              {recomputeJob.error ? (
                <Alert color="red" variant="light" p="xs">
                  {recomputeJob.error}
                </Alert>
              ) : null}
              {recomputeJob.pollingError ? (
                <Alert color="orange" variant="light" p="xs">
                  {recomputeJob.pollingError}
                </Alert>
              ) : null}
              <Group justify="flex-end">
                {recomputeJob.isRunning ? (
                  <Button
                    size="xs"
                    color="orange"
                    variant="light"
                    leftSection={<IconPlayerStop size={15} />}
                    loading={recomputeJob.cancellationRequested}
                    onClick={() => void handleCancelRecomputeJob()}
                  >
                    Dừng an toàn
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={recomputeJob.clear}
                  >
                    Ẩn trạng thái
                  </Button>
                )}
              </Group>
            </Stack>
          </Paper>
        ) : null}

        <Paper withBorder radius="sm" p="xs">
          <Group justify="space-between" align="end" wrap="wrap">
            <Group align="end" gap="sm">
              <Select
                size="sm"
                label="Kỳ công"
                w={128}
                data={monthOptions}
                value={String(month)}
                onChange={(value) => {
                  setMonth(Number(value ?? 1));
                  setPage(1);
                }}
              />
              <Select
                size="sm"
                label="Năm"
                w={92}
                data={yearOptions}
                value={String(year)}
                onChange={(value) => {
                  setYear(Number(value ?? now.getFullYear()));
                  setPage(1);
                }}
              />
              <Stack gap={2}>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  Phạm vi xem & xuất
                </Text>
                <Button
                  size="sm"
                  variant="default"
                  leftSection={<IconFilter size={16} />}
                  onClick={openScopeModal}
                >
                  {scopeLabel}
                </Button>
              </Stack>
              <Select
                size="sm"
                label="Nhân sự"
                w={260}
                searchable
                clearable
                data={employeeOptions}
                value={employeeId}
                searchValue={employeeSearch}
                placeholder="Tìm tên hoặc mã chấm công"
                nothingFoundMessage={
                  employeeSearchQuery.isFetching
                    ? "Đang tìm nhân sự…"
                    : "Không tìm thấy nhân sự"
                }
                onSearchChange={setEmployeeSearch}
                onChange={(value) => {
                  const option = employeeOptions.find(
                    (item) => item.value === value,
                  );
                  setEmployeeId(value);
                  setSelectedEmployee(option ?? null);
                  setEmployeeSearch("");
                  setPage(1);
                }}
              />
            </Group>
            <TimesheetColorLegend />
            <Group gap="xs" pb={2}>
              <Text size="xs" c="dimmed">
                {isGridScopeLoading
                  ? "Đang tải đúng phạm vi đã chọn…"
                  : `${rows.length} nhân viên · ${groupedRows.length} phòng ban`}
              </Text>
            </Group>
          </Group>
        </Paper>

        {isGridScopeLoading ? (
          <Alert color="blue" variant="light" title="Đang tải bảng công">
            {isGridPlaceholderData
              ? "Dữ liệu của kỳ hoặc phạm vi trước đã được ẩn để tránh nhầm lẫn."
              : "Đang tải đúng kỳ và phạm vi đã chọn."}
          </Alert>
        ) : rows.length === 0 ? (
          <Alert
            color="gray"
            variant="light"
            title="Chưa có nhân sự trong phạm vi đang chọn"
          >
            Kiểm tra lại công ty, phòng ban hoặc phân công hiệu lực của nhân sự
            rồi cập nhật lại bảng công.
          </Alert>
        ) : (
          <Stack gap="xs">
            <ScrollArea
              viewportRef={tableViewportRef}
              type="always"
              h="min(680px, calc(100vh - 315px))"
              offsetScrollbars
              scrollbarSize={12}
            >
              <Table
                className="timesheet-bcc-table"
                withTableBorder
                highlightOnHover
                stickyHeader
                stickyHeaderOffset={0}
                horizontalSpacing={0}
                verticalSpacing={0}
                style={{
                  minWidth:
                    fixedColumnsWidth +
                    dayMetas.length * dayColumnWidth +
                    bccTailWidth,
                }}
              >
                <Table.Thead>
                  <Table.Tr>
                    {fixedColumns.map((column) => (
                      <Table.Th
                        key={column.key}
                        rowSpan={2}
                        style={{
                          ...fixedStyle(column.left, column.width, true),
                          textAlign: column.key === "name" ? "left" : "center",
                          verticalAlign: "middle",
                          padding: "5px 7px",
                        }}
                      >
                        {column.label}
                      </Table.Th>
                    ))}
                    {dayMetas.map((meta) => (
                      <Table.Th
                        key={meta.day}
                        style={{
                          minWidth: dayColumnWidth,
                          width: dayColumnWidth,
                          textAlign: "center",
                          background: meta.isSunday ? "#ffe7a6" : "#e6f2df",
                          padding: "5px 2px",
                        }}
                      >
                        {String(meta.day).padStart(2, "0")}
                      </Table.Th>
                    ))}
                    {bccTailColumns.map((column) => (
                      <Table.Th
                        key={column.key}
                        rowSpan={2}
                        style={{
                          minWidth: column.width,
                          whiteSpace: "pre-line",
                          textAlign: "center",
                          verticalAlign: "middle",
                          color:
                            column.key === "unpaidLeaveDays"
                              ? "#e03131"
                              : undefined,
                          background: "#e6f2df",
                          fontSize: 10,
                          lineHeight: 1.15,
                          padding: "4px 3px",
                        }}
                      >
                        {bccTailLabel(column, month, year)}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                  <Table.Tr>
                    {dayMetas.map((meta) => (
                      <Table.Th
                        key={meta.day}
                        style={{
                          minWidth: dayColumnWidth,
                          width: dayColumnWidth,
                          textAlign: "center",
                          background: meta.isSunday ? "#ffe7a6" : "#e6f2df",
                          padding: "5px 2px",
                        }}
                      >
                        {meta.label}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pagedGroups.map((group) => (
                    <Fragment key={group.key}>
                      <Table.Tr>
                        <Table.Td
                          colSpan={fixedColumns.length}
                          style={{
                            background: "#d9d2e9",
                            boxShadow: "2px 0 0 var(--mantine-color-gray-4)",
                            fontSize: 12,
                            fontWeight: 700,
                            left: 0,
                            minWidth: fixedColumnsWidth,
                            padding: "7px 10px",
                            position: "sticky",
                            width: fixedColumnsWidth,
                            zIndex: 3,
                          }}
                        >
                          {group.index}. {group.label}{" "}
                          <Text component="span" size="xs" c="dimmed">
                            (
                            {group.rows.length < group.totalRows
                              ? `${group.rows.length}/${group.totalRows} nhân viên`
                              : `${group.rows.length} nhân viên`}
                            )
                          </Text>
                        </Table.Td>
                        <Table.Td
                          colSpan={dayMetas.length + bccTailColumns.length}
                          style={{
                            background: "#d9d2e9",
                            padding: "7px 10px",
                          }}
                        />
                      </Table.Tr>
                      {group.rows.map((item, rowIndex) => (
                        <TimesheetDataRow
                          key={item.row.employeeId}
                          item={item}
                          employeeNumber={group.startIndex + rowIndex + 1}
                          dayMetas={dayMetas}
                          canEdit={canEdit && !isGridScopeLoading}
                          onOpenCell={openCell}
                          onOpenAutoFullAttendance={
                            openAutoFullAttendanceSettings
                          }
                        />
                      ))}
                    </Fragment>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            <Group justify="space-between" mt="xs" px="xs" wrap="wrap">
              <Text size="xs" c="dimmed">
                Hiển thị {pageStartRecord}–{pageEndRecord} /{" "}
                {preparedRows.length} nhân viên
              </Text>
              <Group gap="xs">
                <Select
                  aria-label="Số nhân sự mỗi trang"
                  size="xs"
                  w={96}
                  data={rowsPerPageOptions}
                  value={String(rowsPerPage)}
                  onChange={(value) => {
                    setRowsPerPage(Number(value ?? 20));
                    setPage(1);
                  }}
                />
                <Pagination
                  size="sm"
                  value={currentPage}
                  total={totalPages}
                  siblings={1}
                  boundaries={1}
                  onChange={setPage}
                />
              </Group>
            </Group>
          </Stack>
        )}
      </Stack>

      <Modal
        opened={scopeModalOpened}
        onClose={() => setScopeModalOpened(false)}
        title="Phạm vi xem và xuất bảng công"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Alert color="violet" variant="light">
            Không chọn mục nào nghĩa là xem và xuất <b>toàn công ty</b>. Có thể
            chọn nhiều đơn vị và phòng ban; khi đã chọn đơn vị, danh sách phòng
            ban chỉ hiện các phòng thuộc đơn vị đó. Nếu chọn cả hai, bảng công
            chỉ lấy các phòng ban đã tick thuộc các đơn vị đã tick. Kết quả được
            gộp trong một bảng công, phân nhóm rõ theo đơn vị/phòng ban.
          </Alert>
          <Group align="flex-start" grow>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600}>Công ty / đơn vị</Text>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  onClick={() => setDraftUnitIds([])}
                >
                  Bỏ chọn
                </Button>
              </Group>
              <ScrollArea h={250} type="auto">
                <Stack gap={8} pr="sm">
                  {unitOptions.map((option) => (
                    <Checkbox
                      key={option.value}
                      label={option.label}
                      checked={draftUnitIds.includes(option.value)}
                      onChange={() => toggleDraftUnitSelection(option.value)}
                    />
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={600}>Phòng ban</Text>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  onClick={() => setDraftDepartmentIds([])}
                >
                  Bỏ chọn
                </Button>
              </Group>
              <ScrollArea h={250} type="auto">
                <Stack gap={8} pr="sm">
                  {visibleDepartmentOptions.map((option) => (
                    <Checkbox
                      key={option.value}
                      label={option.label}
                      checked={draftDepartmentIds.includes(option.value)}
                      onChange={() =>
                        toggleDraftSelection(
                          option.value,
                          draftDepartmentIds,
                          setDraftDepartmentIds,
                        )
                      }
                    />
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
          </Group>
          <Group justify="space-between" mt="xs">
            <Button
              variant="subtle"
              onClick={() => {
                setDraftUnitIds([]);
                setDraftDepartmentIds([]);
              }}
            >
              Xem toàn công ty
            </Button>
            <Group>
              <Button
                variant="default"
                onClick={() => setScopeModalOpened(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  setUnitIds(draftUnitIds);
                  setDepartmentIds(
                    restrictDepartmentsToDraftUnits(
                      draftDepartmentIds,
                      draftUnitIds,
                    ),
                  );
                  setPage(1);
                  setScopeModalOpened(false);
                }}
              >
                Áp dụng phạm vi
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={recomputeRangeModalOpened}
        onClose={() => setRecomputeRangeModalOpened(false)}
        title="Cập nhật bảng công"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Tạo một job chạy nền để cập nhật bảng công theo dải kỳ đã chọn. Bạn
            vẫn có thể xem, lọc và xuất bảng trong lúc job chạy; job không tự
            chạy cho đến khi bấm <b>Bắt đầu cập nhật</b>.
          </Alert>
          <Alert color="violet" variant="light">
            Chỉ các tháng có dữ liệu nguồn mới được xử lý. Tháng không có dữ
            liệu nguồn vẫn chỉ để xem, không tự tạo thiếu công. Ngày kỳ đã
            chốt/khóa và ngày HR sửa tay luôn được giữ nguyên.
          </Alert>

          <Group align="end" grow wrap="wrap">
            <Select
              label="Từ kỳ"
              data={monthOptions}
              value={String(recomputeRangeStart.month)}
              onChange={(value) =>
                setRecomputeRangeStart((current) => ({
                  ...current,
                  month: Number(value ?? current.month),
                }))
              }
            />
            <Select
              label="Năm bắt đầu"
              data={yearOptions}
              value={String(recomputeRangeStart.year)}
              onChange={(value) =>
                setRecomputeRangeStart((current) => ({
                  ...current,
                  year: Number(value ?? current.year),
                }))
              }
            />
            <Select
              label="Đến kỳ"
              data={monthOptions}
              value={String(recomputeRangeEnd.month)}
              onChange={(value) =>
                setRecomputeRangeEnd((current) => ({
                  ...current,
                  month: Number(value ?? current.month),
                }))
              }
            />
            <Select
              label="Năm kết thúc"
              data={yearOptions}
              value={String(recomputeRangeEnd.year)}
              onChange={(value) =>
                setRecomputeRangeEnd((current) => ({
                  ...current,
                  year: Number(value ?? current.year),
                }))
              }
            />
          </Group>

          {recomputeRangePreview.error ? (
            <Alert color="red" variant="light">
              {recomputeRangePreview.error}
            </Alert>
          ) : (
            <Paper withBorder radius="sm" p="sm">
              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  Xem trước: {recomputeRangePreview.months.length} kỳ được yêu
                  cầu
                </Text>
                <Text size="xs" c="dimmed">
                  {formatTimesheetMonth(recomputeRangeStart)} –{" "}
                  {formatTimesheetMonth(recomputeRangeEnd)}
                </Text>
                <Text size="xs" c="dimmed">
                  Phạm vi giữ nguyên khi tạo job: {recomputeScopeLabel}. Máy chủ
                  sẽ xác nhận số tháng/nhân sự thực sự có dữ liệu nguồn ngay sau
                  khi tạo job.
                </Text>
              </Stack>
            </Paper>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setRecomputeRangeModalOpened(false)}
            >
              Hủy
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              disabled={
                !recomputeRangePreview.months.length ||
                isGridScopeLoading ||
                recomputeJob.isRunning ||
                autoFullAttendance.isPending
              }
              onClick={() => void handleStartRecomputeRange()}
            >
              Bắt đầu cập nhật
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={autoFullAttendanceRow !== null}
        onClose={() => setAutoFullAttendanceRow(null)}
        title={
          autoFullAttendanceRow
            ? `Thiết lập đủ công: ${autoFullAttendanceRow.fullName}`
            : "Thiết lập đủ công"
        }
        centered
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Mã chấm công:{" "}
            {formatAttendanceCode(autoFullAttendanceRow?.attendanceCode)}
          </Text>
          <Checkbox
            label="Đủ công mặc định"
            description="Ngày làm việc trong kỳ sẽ tự đủ công; Chủ nhật vẫn là ngày nghỉ."
            checked={autoFullAttendanceEnabled}
            disabled={
              !canEdit ||
              isGridScopeLoading ||
              autoFullAttendance.isPending ||
              recomputeJob.isRunning
            }
            onChange={(event) =>
              setAutoFullAttendanceEnabled(event.currentTarget.checked)
            }
          />
          <Alert color="blue" variant="light">
            Khi đã bật, bảng công hiển thị ký hiệu V ở cột đầu bảng.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setAutoFullAttendanceRow(null)}
            >
              Đóng
            </Button>
            {canEdit ? (
              <Button
                disabled={
                  autoFullAttendanceEnabled ===
                    Boolean(autoFullAttendanceRow?.attendanceAutoFullDay) ||
                  isGridScopeLoading ||
                  recomputeJob.isRunning
                }
                loading={autoFullAttendance.isPending}
                onClick={() => void handleSaveAutoFullAttendance()}
              >
                Lưu thay đổi
              </Button>
            ) : null}
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing
            ? `Sửa ô: ${editing.row.fullName} — ngày ${formatDate(editing.day.date)}`
            : "Sửa ô chấm công"
        }
        centered
      >
        <Stack gap="sm">
          {editing?.day.firstPunch || editing?.day.lastPunch ? (
            <Text size="sm" c="dimmed">
              Máy chấm công ghi nhận: {editing.day.firstPunch ?? "—"} →{" "}
              {editing.day.lastPunch ?? "—"}
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              Máy chấm công không có dữ liệu cho ngày này.
            </Text>
          )}
          <Select
            label="Ký hiệu"
            placeholder="Để trống = xóa ký hiệu khỏi ô"
            clearable
            searchable
            data={SYMBOL_OPTIONS.map((option) => ({
              value: option.code,
              label: `${option.code} — ${option.name}`,
            }))}
            value={editSymbol}
            disabled={isGridScopeLoading || recomputeJob.isRunning}
            onChange={(value) => {
              setEditSymbol(value);
              const option = SYMBOL_OPTIONS.find((item) => item.code === value);
              if (option) setEditPortion(option.defaultPortion);
            }}
          />
          <NumberInput
            label="Số công"
            description="Ca Thứ Bảy 08:00–12:00 tính 1 công theo cấu hình ca"
            min={0}
            max={2}
            step={0.5}
            decimalScale={1}
            value={editPortion}
            onChange={(value) => setEditPortion(Number(value))}
            disabled={
              !editSymbol || isGridScopeLoading || recomputeJob.isRunning
            }
          />
          <Textarea
            label="Lý do sửa"
            description="Bắt buộc — được lưu để đối chiếu khi có khiếu nại"
            withAsterisk
            minRows={2}
            value={editReason}
            disabled={isGridScopeLoading || recomputeJob.isRunning}
            onChange={(event) => setEditReason(event.currentTarget.value)}
          />
          <Alert color="orange" variant="light" icon={<IconTrash size={16} />}>
            Sau khi lưu, ô này sẽ không bị job cập nhật bảng công ghi đè.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button
              disabled={isGridScopeLoading || recomputeJob.isRunning}
              loading={adjustDay.isPending}
              onClick={() => void handleSaveCell()}
            >
              Lưu thay đổi
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
