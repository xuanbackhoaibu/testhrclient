import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Pagination,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCalendarTime,
  IconExternalLink,
  IconInfoCircle,
  IconRefresh,
  IconSearch,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import {
  ALL_ASSIGNMENT_WEEKDAYS,
  optionalAssignmentWeekdays,
} from "../../features/attendance/shiftAssignmentWeekdays";
import { useAuth } from "../../features/auth/useAuth";
import {
  useBulkAssignShifts,
  useIncludeShiftAssignmentRowsInTimesheet,
  useShiftAssignmentGrid,
  useWorkShifts,
} from "../../features/attendance/useWorkSchedule";
import type {
  ShiftAssignmentGridDay,
  ShiftAssignmentGridQuery,
  ShiftAssignmentGridRow,
} from "../../features/attendance/workScheduleTypes";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { HrmDateInput } from "../../shared/components/HrmDateInput";
import { ROUTES } from "../../shared/constants/routes";
import { useImeSafeSearch } from "../../shared/hooks/useImeSafeSearch";
import { formatDate } from "../../shared/utils/date";
import { WeekdayScopeField } from "./components/WeekdayScopeField";

const now = new Date();
const weekdayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dayColumnWidth = 48;
const rowsPerPageOptions = [20, 50, 100].map((value) => ({
  value: String(value),
  label: `${value}/trang`,
}));
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Tháng ${index + 1}`,
}));
const yearOptions = Array.from({ length: 7 }, (_, index) => {
  const year = now.getFullYear() - 2 + index;
  return { value: String(year), label: String(year) };
});
const fixedColumns = [
  { key: "select", label: "", left: 0, width: 48 },
  { key: "number", label: "TT", left: 48, width: 42 },
  { key: "name", label: "Họ và tên", left: 90, width: 210 },
  { key: "code", label: "MCB", left: 300, width: 104 },
] as const;
const fixedColumnsWidth =
  fixedColumns[fixedColumns.length - 1].left +
  fixedColumns[fixedColumns.length - 1].width;
const EMPTY_ROWS: ShiftAssignmentGridRow[] = [];
const EMPTY_SELECTION = new Set<string>();

interface DayMeta {
  day: number;
  label: string;
  isSunday: boolean;
}

interface PreparedRow {
  row: ShiftAssignmentGridRow;
  daysByNumber: Map<number, ShiftAssignmentGridDay>;
}

interface PreparedGroup {
  key: string;
  label: string;
  index: number;
  startIndex: number;
  totalRows: number;
  rows: PreparedRow[];
}

export interface MonthlyShiftAssignmentGridProps {
  onOpenRules: () => void;
  requestedShiftId?: string | null;
}

function isoMonthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function isoMonthEnd(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
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

function organizationKey(...parts: Array<string | null | undefined>): string {
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

function groupLabel(row: ShiftAssignmentGridRow): string {
  return (
    [row.unitName, row.departmentName].filter(Boolean).join(" · ") ||
    "Chưa phân đơn vị / phòng ban"
  );
}

function compareRows(left: PreparedRow, right: PreparedRow): number {
  const leftCode = left.row.attendanceCode ?? left.row.employeeCode;
  const rightCode = right.row.attendanceCode ?? right.row.employeeCode;
  return leftCode.localeCompare(rightCode, "vi", {
    numeric: true,
    sensitivity: "base",
  });
}

function lifecycleText(row: ShiftAssignmentGridRow): string | null {
  if (row.lifecycle === "NEW_HIRE") {
    return `Vào làm: ${formatDate(row.hireDate)}`;
  }
  if (row.lifecycle === "TERMINATED_IN_MONTH") {
    return `Nghỉ từ: ${formatDate(row.terminationEffectiveDate)}`;
  }
  if (row.lifecycle === "NOT_ELIGIBLE") {
    return row.eligibilityReason ?? "Chưa đủ điều kiện phân ca";
  }
  return null;
}

function sourceLabel(source: string): string {
  switch (source) {
    case "ASSIGNMENT_EMPLOYEE":
      return "Ca cá nhân";
    case "ASSIGNMENT_DEPARTMENT":
      return "Theo phòng ban";
    case "ASSIGNMENT_UNIT":
      return "Theo đơn vị";
    case "UNASSIGNED":
      return "Chưa phân ca";
    default:
      return source;
  }
}

function cellVisual(day: ShiftAssignmentGridDay, meta: DayMeta) {
  if (!day.inAttendanceWindow) {
    return { background: "#f8fafc", color: "#94a3b8", label: "" };
  }
  if (day.holidayName) {
    return { background: "#fff3bf", color: "#7c5c00", label: "Lễ" };
  }
  if (day.source === "UNASSIGNED") {
    return { background: "#e5e7eb", color: "#64748b", label: "—" };
  }
  if (!day.isWorkingDay) {
    return {
      background: meta.isSunday ? "#f1f3f5" : "#f8f9fa",
      color: "#94a3b8",
      label: "",
    };
  }
  if (day.source === "ASSIGNMENT_EMPLOYEE") {
    return {
      background: "#dbeafe",
      color: "#1d4ed8",
      label: day.shift?.code ?? "—",
    };
  }
  if (day.source === "ASSIGNMENT_DEPARTMENT") {
    return {
      background: "#eef6ff",
      color: "#2563eb",
      label: day.shift?.code ?? "—",
    };
  }
  if (day.source === "ASSIGNMENT_UNIT") {
    return {
      background: "#ecfdf5",
      color: "#047857",
      label: day.shift?.code ?? "—",
    };
  }
  return {
    background: undefined,
    color: "inherit",
    label: day.shift?.code ?? "—",
  };
}

function cellDescription(day: ShiftAssignmentGridDay): string {
  if (!day.inAttendanceWindow) {
    return "Ngoài khoảng tính công của nhân sự trong kỳ này";
  }
  if (day.holidayName) {
    return `${day.holidayName} — không tính công theo ca`;
  }
  if (day.source === "UNASSIGNED") {
    return "Chưa phân ca — BCC sẽ chưa tính công";
  }
  if (!day.isWorkingDay) {
    return "Ngày không làm việc theo lịch công";
  }
  return day.shift
    ? `${day.shift.code} — ${day.shift.name} · ${sourceLabel(day.source)}`
    : sourceLabel(day.source);
}

function Legend() {
  const items = [
    { color: "#dbeafe", label: "Ca cá nhân" },
    { color: "#eef6ff", label: "Theo phòng ban" },
    { color: "#ecfdf5", label: "Theo đơn vị" },
    { color: "#e5e7eb", label: "Chưa phân ca" },
    { color: "#fff3bf", label: "Ngày lễ" },
    { color: "#f8fafc", label: "Ngoài khoảng tính công" },
  ];

  return (
    <Group gap="xs" wrap="wrap">
      {items.map((item) => (
        <Group key={item.label} gap={4} wrap="nowrap">
          <span
            aria-hidden
            style={{
              background: item.color,
              border: "1px solid var(--mantine-color-gray-4)",
              borderRadius: 3,
              display: "block",
              height: 11,
              width: 11,
            }}
          />
          <Text fz={10} lh={1.2} c="dimmed">
            {item.label}
          </Text>
        </Group>
      ))}
    </Group>
  );
}

export function MonthlyShiftAssignmentGrid({
  onOpenRules,
  requestedShiftId = null,
}: MonthlyShiftAssignmentGridProps) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [requestedUnitId, setRequestedUnitId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectionState, setSelectionState] = useState<{
    scope: string;
    employeeIds: Set<string>;
  }>(() => ({ scope: "", employeeIds: new Set() }));
  const [shiftId, setShiftId] = useState<string | null>(requestedShiftId);
  const [weekdays, setWeekdays] = useState<number[]>(() => [
    ...ALL_ASSIGNMENT_WEEKDAYS,
  ]);
  const [includeInTimesheetWithShift, setIncludeInTimesheetWithShift] =
    useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [pageState, setPageState] = useState({ scope: "", page: 1 });

  const periodStart = isoMonthStart(year, month);
  const periodEnd = isoMonthEnd(year, month);
  const periodScope = `${year}|${month}`;
  const [dateRangeState, setDateRangeState] = useState({
    scope: "",
    effectiveFrom: "",
    effectiveTo: "",
  });
  const effectiveFrom =
    dateRangeState.scope === periodScope
      ? dateRangeState.effectiveFrom
      : periodStart;
  const effectiveTo =
    dateRangeState.scope === periodScope
      ? dateRangeState.effectiveTo
      : periodEnd;

  const unitsQuery = useUnitsSelect();
  const shiftsQuery = useWorkShifts();
  const bulkAssign = useBulkAssignShifts();
  const includeInTimesheet = useIncludeShiftAssignmentRowsInTimesheet();
  const unitOptions = useMemo(
    () =>
      (unitsQuery.data ?? []).map((unit) => ({
        value: unit.id,
        label: `${unit.code} — ${unit.name}`,
      })),
    [unitsQuery.data],
  );
  const selectedUnitId =
    requestedUnitId &&
    unitOptions.some((option) => option.value === requestedUnitId)
      ? requestedUnitId
      : (unitOptions[0]?.value ?? null);
  const departmentsQuery = useDepartmentsSelect(selectedUnitId ?? undefined);
  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((department) => ({
        value: department.id,
        label: `${department.code} — ${department.name}`,
      })),
    [departmentsQuery.data],
  );
  const searchInput = useImeSafeSearch({
    onSearch: (value) => setSearch(value.trim()),
  });
  const query = useMemo<ShiftAssignmentGridQuery | null>(
    () =>
      selectedUnitId
        ? {
            month,
            year,
            unitId: selectedUnitId,
            departmentId: departmentId ?? undefined,
            search: search || undefined,
          }
        : null,
    [departmentId, month, search, selectedUnitId, year],
  );
  const gridQuery = useShiftAssignmentGrid(query);
  const grid = gridQuery.data;
  const rows = grid?.rows ?? EMPTY_ROWS;
  const shiftOptions = useMemo(
    () =>
      (shiftsQuery.data ?? [])
        .filter((shift) => shift.status === "ACTIVE")
        .map((shift) => ({
          value: shift.id,
          label: `${shift.code} — ${shift.name} (${shift.startTime}–${shift.endTime})`,
        })),
    [shiftsQuery.data],
  );
  const selectionScope = `${year}|${month}|${selectedUnitId ?? ""}`;
  const selectedEmployeeIds =
    selectionState.scope === selectionScope
      ? selectionState.employeeIds
      : EMPTY_SELECTION;
  const pageScope = `${selectionScope}|${departmentId ?? ""}|${search}`;

  const dayMetas = useMemo(
    () =>
      Array.from({ length: grid?.daysInMonth ?? 0 }, (_, index) =>
        makeDayMeta(year, month, index + 1),
      ),
    [grid?.daysInMonth, month, year],
  );
  const preparedRows = useMemo<PreparedRow[]>(
    () =>
      rows.map((row) => ({
        row,
        daysByNumber: new Map(row.days.map((day) => [day.day, day])),
      })),
    [rows],
  );
  const groupedRows = useMemo<PreparedGroup[]>(() => {
    const groups = new Map<string, { label: string; rows: PreparedRow[] }>();
    for (const item of preparedRows) {
      const key =
        item.row.departmentId ??
        organizationKey(item.row.unitName, item.row.departmentName);
      const existing = groups.get(key);
      if (existing) {
        existing.rows.push(item);
      } else {
        groups.set(key, { label: groupLabel(item.row), rows: [item] });
      }
    }

    const orderedGroups = [...groups.entries()].sort(
      ([leftKey, left], [rightKey, right]) =>
        `${leftKey}\u0000${left.label}`.localeCompare(
          `${rightKey}\u0000${right.label}`,
          "vi",
          { numeric: true, sensitivity: "base" },
        ),
    );
    return orderedGroups.map(([key, group], index) => {
      const sortedRows = [...group.rows].sort(compareRows);
      const startIndex = orderedGroups
        .slice(0, index)
        .reduce((total, [, previous]) => total + previous.rows.length, 0);
      return {
        key,
        label: group.label,
        index: index + 1,
        startIndex,
        totalRows: sortedRows.length,
        rows: sortedRows,
      };
    });
  }, [preparedRows]);
  const totalRows = preparedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const currentPage = Math.min(
    pageState.scope === pageScope ? pageState.page : 1,
    totalPages,
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageEnd = pageStart + rowsPerPage;
  const pagedGroups = useMemo(
    () =>
      groupedRows.flatMap((group) => {
        const groupEnd = group.startIndex + group.rows.length;
        const sliceStart = Math.max(0, pageStart - group.startIndex);
        const sliceEnd = Math.min(
          group.rows.length,
          pageEnd - group.startIndex,
        );
        if (
          pageStart >= groupEnd ||
          pageEnd <= group.startIndex ||
          sliceStart >= sliceEnd
        ) {
          return [];
        }
        return [
          {
            ...group,
            pageStartIndex: group.startIndex + sliceStart,
            rows: group.rows.slice(sliceStart, sliceEnd),
          },
        ];
      }),
    [groupedRows, pageEnd, pageStart],
  );
  const pageRows = useMemo(
    () => pagedGroups.flatMap((group) => group.rows),
    [pagedGroups],
  );
  const selectablePageRows = pageRows.filter((item) => item.row.canInclude);
  const selectedOnPage = selectablePageRows.filter((item) =>
    selectedEmployeeIds.has(item.row.employeeId),
  ).length;
  const allPageSelected =
    selectablePageRows.length > 0 &&
    selectedOnPage === selectablePageRows.length;
  const somePageSelected = selectedOnPage > 0 && !allPageSelected;
  const tableIsDisabled = !canEdit || Boolean(grid?.isClosed);

  function toggleEmployee(employeeId: string, checked: boolean) {
    setSelectionState((current) => {
      const next = new Set(
        current.scope === selectionScope ? current.employeeIds : [],
      );
      if (checked) next.add(employeeId);
      else next.delete(employeeId);
      return { scope: selectionScope, employeeIds: next };
    });
  }

  function togglePage(checked: boolean) {
    setSelectionState((current) => {
      const next = new Set(
        current.scope === selectionScope ? current.employeeIds : [],
      );
      selectablePageRows.forEach(({ row }) => {
        if (checked) next.add(row.employeeId);
        else next.delete(row.employeeId);
      });
      return { scope: selectionScope, employeeIds: next };
    });
  }

  function updateEffectiveFrom(value: string | null) {
    setDateRangeState((current) => ({
      scope: periodScope,
      effectiveFrom: value ?? periodStart,
      effectiveTo:
        current.scope === periodScope ? current.effectiveTo : periodEnd,
    }));
  }

  function updateEffectiveTo(value: string | null) {
    setDateRangeState((current) => ({
      scope: periodScope,
      effectiveFrom:
        current.scope === periodScope ? current.effectiveFrom : periodStart,
      effectiveTo: value ?? periodEnd,
    }));
  }

  async function applyShift() {
    if (!selectedUnitId) return;
    if (!selectedEmployeeIds.size) {
      notifications.show({
        color: "yellow",
        title: "Chưa chọn CBNV",
        message: "Tích chọn ít nhất một CBNV để áp dụng ca làm việc.",
      });
      return;
    }
    if (!shiftId) {
      notifications.show({
        color: "yellow",
        title: "Chưa chọn ca",
        message: "Chọn một ca đang áp dụng trước khi lưu phân ca.",
      });
      return;
    }
    if (!effectiveFrom || !effectiveTo || effectiveTo < effectiveFrom) {
      notifications.show({
        color: "yellow",
        title: "Khoảng ngày chưa hợp lệ",
        message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.",
      });
      return;
    }
    if (!weekdays.length) {
      notifications.show({
        color: "yellow",
        title: "Chưa chọn ngày áp dụng",
        message: "Chọn ít nhất một ngày để áp dụng ca làm việc.",
      });
      return;
    }

    try {
      const assignmentWeekdays = optionalAssignmentWeekdays(weekdays);
      const result = await bulkAssign.mutateAsync({
        month,
        year,
        unitId: selectedUnitId,
        employeeIds: [...selectedEmployeeIds],
        shiftId,
        effectiveFrom,
        effectiveTo,
        includeInTimesheet: includeInTimesheetWithShift,
        ...(assignmentWeekdays ? { weekdays: assignmentWeekdays } : {}),
      });
      setSelectionState({ scope: selectionScope, employeeIds: new Set() });
      notifications.show({
        color: "green",
        title: "Đã áp ca làm việc",
        message: includeInTimesheetWithShift
          ? `Đã phân ca và đưa ${result.includedInTimesheet ?? result.created} CBNV vào BCC. Mở BCC, bấm Cập nhật bảng công rồi mới xuất Excel.`
          : `Đã phân ca cho ${result.created} CBNV. Họ chưa vào BCC; dùng nút “Đưa vào BCC” khi đã sẵn sàng.`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Chưa thể áp ca",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Kiểm tra khoảng ngày hoặc ca cá nhân đang chồng lấn rồi thử lại.",
      });
    }
  }

  async function includeSelectedInTimesheet() {
    if (!selectedUnitId) return;
    if (!selectedEmployeeIds.size) {
      notifications.show({
        color: "yellow",
        title: "Chưa chọn CBNV",
        message: "Tích chọn ít nhất một CBNV để đưa vào BCC.",
      });
      return;
    }
    if (grid?.isClosed) {
      notifications.show({
        color: "orange",
        title: "Kỳ công đã chốt",
        message: "Mở lại kỳ công trước khi thay đổi danh sách BCC.",
      });
      return;
    }

    try {
      const result = await includeInTimesheet.mutateAsync({
        month,
        year,
        unitId: selectedUnitId,
        employeeIds: [...selectedEmployeeIds],
      });
      notifications.show({
        color: "green",
        title: "Đã đưa CBNV vào BCC",
        message:
          result.includedInTimesheet > 0
            ? `Đã đưa ${result.includedInTimesheet} CBNV vào BCC mà không thay đổi ca đã phân. Mở BCC, bấm Cập nhật bảng công rồi kiểm tra kết quả.`
            : "Các CBNV đã chọn đã ở BCC; không có ca nào bị thay đổi.",
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Chưa thể đưa vào BCC",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Kiểm tra kỳ công, phạm vi đơn vị hoặc CBNV đã có ở BCC đơn vị khác rồi thử lại.",
      });
    }
  }

  function openTimesheet() {
    if (!selectedUnitId) return;
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
      unitId: selectedUnitId,
    });
    navigate(`${ROUTES.timesheetGrid}?${params.toString()}`);
  }

  function openMonthlyRoster() {
    if (!selectedUnitId) return;
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
      unitId: selectedUnitId,
    });
    navigate(ROUTES.monthlyTimesheetRoster + "?" + params.toString());
  }

  return (
    <Stack gap="md">
      <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
        Phân ca ở đây tạo <b>ca cá nhân</b> cho các CBNV được tích chọn; ca cá
        nhân ưu tiên hơn ca phòng ban và đơn vị. Mặc định, <b>Áp dụng ca</b>{" "}
        cũng đưa đúng các CBNV đó vào BCC. Bỏ chọn “Đưa vào BCC cùng ca” khi
        chỉ muốn lập kế hoạch ca. Với CBNV đã có ca, dùng <b>Đưa vào BCC</b> để
        bổ sung bảng công mà không tạo lại ca. Sau đó mở đúng kỳ, bấm{" "}
        <b>Cập nhật bảng công</b> rồi mới xuất Excel.
      </Alert>

      <Paper withBorder p="md" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="sm">
          <Select
            label="Kỳ công"
            data={monthOptions}
            value={String(month)}
            allowDeselect={false}
            onChange={(value) => setMonth(Number(value ?? month))}
          />
          <Select
            label="Năm"
            data={yearOptions}
            value={String(year)}
            allowDeselect={false}
            onChange={(value) => setYear(Number(value ?? year))}
          />
          <Select
            label="Đơn vị"
            placeholder="Chọn đơn vị"
            data={unitOptions}
            value={selectedUnitId}
            searchable
            disabled={unitsQuery.isLoading}
            onChange={(value) => {
              setRequestedUnitId(value);
              setDepartmentId(null);
            }}
          />
          <Select
            label="Phòng ban"
            placeholder="Tất cả phòng ban"
            data={departmentOptions}
            value={departmentId}
            searchable
            clearable
            disabled={!selectedUnitId || departmentsQuery.isLoading}
            onChange={setDepartmentId}
          />
          <TextInput
            label="Nhân sự"
            placeholder="Tìm tên, MCB hoặc mã nhân sự"
            leftSection={<IconSearch size={16} />}
            {...searchInput.inputProps}
          />
        </SimpleGrid>
      </Paper>

      {!selectedUnitId && !unitsQuery.isLoading ? (
        <Alert color="yellow" variant="light" title="Chưa có đơn vị để phân ca">
          Tạo hoặc cấp quyền xem đơn vị trước khi lập phân ca tháng.
        </Alert>
      ) : null}

      {grid?.isClosed ? (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          color="orange"
          variant="light"
          title="Kỳ công đã chốt"
        >
          Không thể thay đổi phân ca của kỳ này. Mở lại kỳ công trước khi thao
          tác.
        </Alert>
      ) : null}

      {selectedUnitId && !grid?.rosterConfigured && !gridQuery.isLoading ? (
        <Alert
          icon={<IconCalendarTime size={18} />}
          color="yellow"
          variant="light"
          title="Chưa khởi tạo bảng sắp ca tháng"
        >
          Bạn vẫn có thể xem và phân ca cho toàn bộ CBNV trong đơn vị. Bật
          <b> Đưa vào BCC cùng ca</b> khi áp ca, hoặc dùng nút <b>Đưa vào BCC</b>
          cho người đã có ca; hệ thống sẽ khởi tạo danh sách tháng an toàn.
        </Alert>
      ) : null}

      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
          <Group align="flex-end" gap="sm" wrap="wrap">
            <Text size="sm" fw={600} mb={7}>
              Đã chọn {selectedEmployeeIds.size} CBNV
            </Text>
            <Select
              label="Ca làm việc"
              placeholder="Chọn ca đã tạo"
              data={shiftOptions}
              value={shiftId}
              searchable
              w={290}
              disabled={tableIsDisabled || shiftsQuery.isLoading}
              nothingFoundMessage="Chưa có ca đang áp dụng"
              onChange={setShiftId}
            />
            <HrmDateInput
              label="Từ ngày"
              clearable={false}
              minDate={periodStart}
              maxDate={periodEnd}
              value={effectiveFrom}
              w={150}
              disabled={tableIsDisabled}
              onChange={updateEffectiveFrom}
            />
            <HrmDateInput
              label="Đến ngày"
              clearable={false}
              minDate={effectiveFrom || periodStart}
              maxDate={periodEnd}
              value={effectiveTo}
              w={150}
              disabled={tableIsDisabled}
              onChange={updateEffectiveTo}
            />
            <WeekdayScopeField
              disabled={tableIsDisabled}
              value={weekdays}
              width={294}
              onChange={setWeekdays}
            />
            <Checkbox
              label="Đưa vào BCC cùng ca"
              checked={includeInTimesheetWithShift}
              disabled={
                tableIsDisabled ||
                bulkAssign.isPending ||
                includeInTimesheet.isPending
              }
              onChange={(event) =>
                setIncludeInTimesheetWithShift(event.currentTarget.checked)
              }
            />
            <Button
              leftSection={<IconUsers size={17} />}
              loading={bulkAssign.isPending}
              disabled={
                tableIsDisabled ||
                bulkAssign.isPending ||
                includeInTimesheet.isPending ||
                !selectedEmployeeIds.size ||
                !shiftId ||
                !effectiveFrom ||
                !effectiveTo
              }
              onClick={() => void applyShift()}
            >
              Áp dụng ca
            </Button>
            <Button
              variant="light"
              color="green"
              leftSection={<IconUserCheck size={17} />}
              loading={includeInTimesheet.isPending}
              disabled={
                tableIsDisabled ||
                bulkAssign.isPending ||
                includeInTimesheet.isPending ||
                !selectedEmployeeIds.size
              }
              onClick={() => void includeSelectedInTimesheet()}
            >
              Đưa vào BCC
            </Button>
          </Group>
          <Group gap="xs">
            <Button
              variant="default"
              size="sm"
              leftSection={<IconCalendarTime size={16} />}
              disabled={!selectedUnitId}
              onClick={openMonthlyRoster}
            >
              Sắp ca tháng
            </Button>
            <Button variant="default" size="sm" onClick={onOpenRules}>
              Quy tắc PB/đơn vị
            </Button>
            <Button
              variant="light"
              size="sm"
              leftSection={<IconExternalLink size={16} />}
              disabled={!selectedUnitId}
              onClick={openTimesheet}
            >
              Mở BCC
            </Button>
          </Group>
        </Group>
        <Group mt="sm" gap="xs" wrap="wrap">
          <Legend />
          <Text size="xs" c="dimmed">
            Ca cá nhân đang chồng ngày sẽ được báo lỗi; hệ thống không tự ghi đè
            lịch sử.
          </Text>
        </Group>
      </Paper>

      {gridQuery.isLoading ? (
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Skeleton h={24} w="32%" />
            <Skeleton h={390} />
          </Stack>
        </Paper>
      ) : null}

      {gridQuery.isError ? (
        <Alert color="red" variant="light" title="Không tải được bảng phân ca">
          Không thể lấy ca kế hoạch theo kỳ và đơn vị đang chọn.{" "}
          <Button
            size="compact-sm"
            variant="subtle"
            leftSection={<IconRefresh size={15} />}
            onClick={() => void gridQuery.refetch()}
          >
            Tải lại
          </Button>
        </Alert>
      ) : null}

      {!gridQuery.isLoading &&
      !gridQuery.isError &&
      selectedUnitId &&
      rows.length === 0 ? (
        <Alert
          color="gray"
          variant="light"
          title="Chưa có CBNV trong phạm vi này"
        >
          Kiểm tra đơn vị, phòng ban hoặc bảng sắp ca tháng. CBNV phải có phân
          công tổ chức hiệu lực trong kỳ mới có thể được phân ca.
        </Alert>
      ) : null}

      {!gridQuery.isLoading && !gridQuery.isError && rows.length > 0 ? (
        <Stack gap="xs">
          <ScrollArea
            type="always"
            h="min(680px, calc(100vh - 355px))"
            offsetScrollbars
            scrollbarSize={12}
          >
            <Table
              className="timesheet-bcc-table"
              withTableBorder
              highlightOnHover
              stickyHeader
              horizontalSpacing={0}
              verticalSpacing={0}
              style={{
                minWidth: fixedColumnsWidth + dayMetas.length * dayColumnWidth,
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th
                    rowSpan={2}
                    style={{
                      ...fixedStyle(
                        fixedColumns[0].left,
                        fixedColumns[0].width,
                        true,
                      ),
                      textAlign: "center",
                    }}
                  >
                    <Checkbox
                      aria-label="Chọn tất cả CBNV trên trang"
                      checked={allPageSelected}
                      indeterminate={somePageSelected}
                      disabled={tableIsDisabled || !selectablePageRows.length}
                      onChange={(event) =>
                        togglePage(event.currentTarget.checked)
                      }
                    />
                  </Table.Th>
                  {fixedColumns.slice(1).map((column) => (
                    <Table.Th
                      key={column.key}
                      rowSpan={2}
                      style={{
                        ...fixedStyle(column.left, column.width, true),
                        padding: "5px 7px",
                        textAlign: column.key === "name" ? "left" : "center",
                        verticalAlign: "middle",
                      }}
                    >
                      {column.label}
                    </Table.Th>
                  ))}
                  {dayMetas.map((meta) => (
                    <Table.Th
                      key={meta.day}
                      style={{
                        background: meta.isSunday ? "#ffe7a6" : "#e6f2df",
                        minWidth: dayColumnWidth,
                        padding: "5px 2px",
                        textAlign: "center",
                        width: dayColumnWidth,
                      }}
                    >
                      {String(meta.day).padStart(2, "0")}
                    </Table.Th>
                  ))}
                </Table.Tr>
                <Table.Tr>
                  {dayMetas.map((meta) => (
                    <Table.Th
                      key={meta.day}
                      style={{
                        background: meta.isSunday ? "#ffe7a6" : "#e6f2df",
                        minWidth: dayColumnWidth,
                        padding: "5px 2px",
                        textAlign: "center",
                        width: dayColumnWidth,
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
                            ? `${group.rows.length}/${group.totalRows}`
                            : group.rows.length}{" "}
                          CBNV)
                        </Text>
                      </Table.Td>
                      <Table.Td
                        colSpan={dayMetas.length}
                        style={{ background: "#d9d2e9", padding: "7px 10px" }}
                      />
                    </Table.Tr>
                    {group.rows.map((item, rowIndex) => {
                      const lifecycle = lifecycleText(item.row);
                      return (
                        <Table.Tr key={item.row.employeeId}>
                          <Table.Td
                            style={{
                              ...fixedStyle(
                                fixedColumns[0].left,
                                fixedColumns[0].width,
                              ),
                              textAlign: "center",
                            }}
                          >
                            <Checkbox
                              aria-label={`Chọn ${item.row.fullName} để áp ca`}
                              checked={selectedEmployeeIds.has(
                                item.row.employeeId,
                              )}
                              disabled={tableIsDisabled || !item.row.canInclude}
                              onChange={(event) =>
                                toggleEmployee(
                                  item.row.employeeId,
                                  event.currentTarget.checked,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td
                            style={{
                              ...fixedStyle(
                                fixedColumns[1].left,
                                fixedColumns[1].width,
                              ),
                              textAlign: "center",
                            }}
                          >
                            {group.pageStartIndex + rowIndex + 1}
                          </Table.Td>
                          <Table.Td
                            style={{
                              ...fixedStyle(
                                fixedColumns[2].left,
                                fixedColumns[2].width,
                              ),
                              padding: "4px 6px",
                            }}
                          >
                            <Stack gap={1}>
                              <Text size="xs" fw={600} truncate="end">
                                {item.row.fullName}
                              </Text>
                              {lifecycle ? (
                                <Text
                                  size="10px"
                                  c={
                                    item.row.lifecycle === "NOT_ELIGIBLE"
                                      ? "red.7"
                                      : "dimmed"
                                  }
                                  lineClamp={1}
                                  title={lifecycle}
                                >
                                  {lifecycle}
                                </Text>
                              ) : null}
                              <Badge
                                size="xs"
                                variant="light"
                                color={
                                  item.row.includedInTimesheet
                                    ? "green"
                                    : "gray"
                                }
                                w="fit-content"
                              >
                                {item.row.includedInTimesheet
                                  ? "Đã vào BCC"
                                  : "Chưa vào BCC"}
                              </Badge>
                            </Stack>
                          </Table.Td>
                          <Table.Td
                            style={fixedStyle(
                              fixedColumns[3].left,
                              fixedColumns[3].width,
                            )}
                          >
                            <Text
                              size="xs"
                              fw={600}
                              title="Mã chấm công BioTime/MCB"
                            >
                              {item.row.attendanceCode ?? "—"}
                            </Text>
                          </Table.Td>
                          {dayMetas.map((meta) => {
                            const day = item.daysByNumber.get(meta.day);
                            if (!day) {
                              return (
                                <Table.Td
                                  key={meta.day}
                                  style={{
                                    background: "#f8fafc",
                                    minWidth: dayColumnWidth,
                                    textAlign: "center",
                                    width: dayColumnWidth,
                                  }}
                                />
                              );
                            }
                            const visual = cellVisual(day, meta);
                            return (
                              <Table.Td
                                key={meta.day}
                                title={cellDescription(day)}
                                style={{
                                  background: visual.background,
                                  minWidth: dayColumnWidth,
                                  textAlign: "center",
                                  width: dayColumnWidth,
                                }}
                              >
                                <Text
                                  size="xs"
                                  fw={day.shift ? 700 : 500}
                                  c={visual.color}
                                  lineClamp={1}
                                >
                                  {visual.label}
                                </Text>
                              </Table.Td>
                            );
                          })}
                        </Table.Tr>
                      );
                    })}
                  </Fragment>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Group justify="space-between" px="xs" wrap="wrap">
            <Text size="xs" c="dimmed">
              Hiển thị {totalRows ? pageStart + 1 : 0}–
              {Math.min(pageEnd, totalRows)} / {totalRows} CBNV
            </Text>
            <Group gap="xs">
              <Select
                aria-label="Số CBNV mỗi trang"
                size="xs"
                w={96}
                data={rowsPerPageOptions}
                value={String(rowsPerPage)}
                onChange={(value) => {
                  setRowsPerPage(Number(value ?? 20));
                  setPageState({ scope: pageScope, page: 1 });
                }}
              />
              <Pagination
                size="sm"
                value={currentPage}
                total={totalPages}
                siblings={1}
                boundaries={1}
                onChange={(nextPage) =>
                  setPageState({ scope: pageScope, page: nextPage })
                }
              />
            </Group>
          </Group>
        </Stack>
      ) : null}
    </Stack>
  );
}
