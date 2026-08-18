import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Pagination,
  Paper,
  Popover,
  ScrollArea,
  Select,
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
  IconRefresh,
  IconSearch,
  IconUserCheck,
  IconUsers,
  IconX,
} from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import {
  ALL_ASSIGNMENT_WEEKDAYS,
  canOpenShiftAssignmentGridPicker,
  isFullDayAdministrativeOfficeShift,
  isWeeklyTemplateAssignmentSource,
  MONDAY_TO_FRIDAY,
  optionalAssignmentWeekdays,
  singleDayShiftAssignmentScope,
  requiresOneDayShiftOverride,
  weekdayForShiftAssignmentDate,
} from "../../features/attendance/shiftAssignmentWeekdays";
import { useAuth } from "../../features/auth/useAuth";
import {
  getWorkShiftCatalogOrder,
  sortWorkShiftCatalog,
} from "../../features/attendance/workShiftCatalogOrder";
import {
  directCellShiftDisabledReason,
  formatShiftHoursAndWorkday,
} from "../../features/attendance/shiftAssignmentEligibility";
import {
  sumAssignmentTotals,
  summarizeAssignedPerDay,
  summarizeAssignmentRow,
  type ShiftAssignmentRowTotals,
} from "../../features/attendance/shiftAssignmentTotals";
import {
  useBulkAssignShifts,
  useCancelShiftAssignmentDay,
  useIncludeShiftAssignmentRowsInTimesheet,
  useReplaceShiftAssignmentDay,
  useShiftAssignmentGrid,
  useWorkShifts,
} from "../../features/attendance/useWorkSchedule";
import type {
  ShiftAssignmentGridDay,
  ShiftAssignmentGridQuery,
  ShiftAssignmentGridRow,
  WorkShift,
} from "../../features/attendance/workScheduleTypes";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { HrmDateInput } from "../../shared/components/HrmDateInput";
import { ROUTES } from "../../shared/constants/routes";
import { InfoBanner } from "../../shared/components/InfoBanner";
import { FilterBar } from "../../shared/components/FilterBar";
import filterStyles from "../../shared/components/FilterBar.module.css";
import { useImeSafeSearch } from "../../shared/hooks/useImeSafeSearch";
import { formatDate } from "../../shared/utils/date";
import { includesNormalizedSearch } from "../../shared/utils/normalizeSearchText";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
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

/*
 * Năm cột công đầu tiên đúng theo bảng chấm công mẫu, quy ra SỐ CÔNG theo danh
 * mục 'Ca làm việc' (shiftPayrollCatalog.ts) — không phải đếm số ngày. Cột (6)
 * là tổng của (1)..(5).
 *
 * Ba cột cuối là thông tin riêng của bảng phân ca, giúp thấy lịch còn hở chỗ
 * nào: ngày làm việc chưa có ca, ngày nghỉ theo lịch, ngày ngoài khoảng tính
 * công. Mẫu Excel không có ba cột này.
 */
const totalColumns = [
  { key: "workDays", label: "Công làm việc\nthực tế\n(1)", width: 78 },
  { key: "publicHolidayDays", label: "Nghỉ Lễ\n(2)", width: 62 },
  { key: "annualLeaveDays", label: "Nghỉ\nPhép\n(3)", width: 62 },
  { key: "personalLeaveDays", label: "Nghỉ Việc\nriêng\n(4)", width: 68 },
  { key: "compensatoryLeaveDays", label: "Nghỉ bù\n(5)", width: 62 },
] as const;
const TOTAL_SUM_COLUMN_WIDTH = 92;
/** Cột chẩn đoán riêng của bảng phân ca, đứng sau cột tổng (6). */
const diagnosticColumns = [
  {
    key: "unassignedWorkingDays",
    label: "Ngày làm việc\nchưa phân ca",
    width: 84,
    highlightWhenPositive: true,
  },
  { key: "offDays", label: "Nghỉ\ntheo ca", width: 62 },
  { key: "outOfWindowDays", label: "Ngoài khoảng\ntính công", width: 78 },
] as const;
const totalColumnsWidth =
  totalColumns.reduce((sum, column) => sum + column.width, 0) +
  TOTAL_SUM_COLUMN_WIDTH +
  diagnosticColumns.reduce((sum, column) => sum + column.width, 0);

/* Số công luôn là bội của 0.5, nên "23.5" chứ không phải "23.50", và số tròn
   hiện "24" như trên bảng chấm công giấy. */
function formatWorkdayValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
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
  totals: ShiftAssignmentRowTotals;
}

interface PreparedGroup {
  key: string;
  label: string;
  index: number;
  startIndex: number;
  totalRows: number;
  rows: PreparedRow[];
}

interface CellShiftPicker {
  employeeId: string;
  fullName: string;
  day: ShiftAssignmentGridDay;
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
    case "WEEKLY_TEMPLATE_EMPLOYEE":
    case "WEEKLY_TEMPLATE":
      return "Theo ca tuần";
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
  if (isWeeklyTemplateAssignmentSource(day.source)) {
    if (!day.shift) {
      return { background: "#f1f5f9", color: "#64748b", label: "Nghỉ" };
    }
    return {
      background: "#ede9fe",
      color: "#6d28d9",
      label: day.shift.code,
    };
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

function cellDescription(
  day: ShiftAssignmentGridDay,
  hasActiveDirectShift: boolean,
): string {
  if (!day.inAttendanceWindow) {
    return "Ngoài khoảng tính công của nhân sự trong kỳ này";
  }
  if (day.holidayName) {
    return `${day.holidayName} — không tính công theo ca`;
  }
  if (day.source === "UNASSIGNED") {
    return weekdayForShiftAssignmentDate(day.date) === 0
      ? hasActiveDirectShift
        ? "Chủ nhật mặc định nghỉ — nhấn để HR phân ca riêng"
        : "Chủ nhật mặc định nghỉ — chưa có ca đang áp dụng để phân"
      : !day.calendarIsWorkingDay
        ? "Ngày được cấu hình nghỉ — không áp ca tại đây"
        : "Chưa phân ca — nhấn để chọn ca";
  }
  if (isWeeklyTemplateAssignmentSource(day.source)) {
    const templateName = day.weeklyTemplate?.name
      ? ` · ${day.weeklyTemplate.name}`
      : "";
    if (!day.shift) {
      return `Nghỉ theo ca tuần${templateName} — không kế thừa ca phòng ban, đơn vị hoặc lịch chung. Nhấn để phân ca ngoại lệ cho đúng ngày.`;
    }
    return `${day.shift.code} — ${day.shift.name} · Theo ca tuần${templateName} · Nhấn để đổi ca cho đúng ngày.`;
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
    { color: "#ede9fe", label: "Theo ca tuần" },
    { color: "#f1f5f9", label: "Nghỉ theo ca" },
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
  const [cellShiftPicker, setCellShiftPicker] =
    useState<CellShiftPicker | null>(null);
  const [cellShiftCancellation, setCellShiftCancellation] =
    useState<CellShiftPicker | null>(null);
  const [cellShiftCancellationError, setCellShiftCancellationError] =
    useState<string | null>(null);
  const [cellShiftSearch, setCellShiftSearch] = useState("");
  const [cellShiftError, setCellShiftError] = useState<string | null>(null);
  const [cellShiftApplyingId, setCellShiftApplyingId] = useState<string | null>(
    null,
  );
  const [shiftId, setShiftId] = useState<string | null>(requestedShiftId);
  const [weekdays, setWeekdays] = useState<number[]>(() => [
    ...ALL_ASSIGNMENT_WEEKDAYS,
  ]);
  const didDefaultRequestedShiftScope = useRef(false);
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
  const cancelShiftAssignmentDay = useCancelShiftAssignmentDay();
  const replaceShiftAssignmentDay = useReplaceShiftAssignmentDay();
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
      sortWorkShiftCatalog(shiftsQuery.data)
        .filter((shift) => shift.status === "ACTIVE")
        .map((shift) => ({
          value: shift.id,
          label:
            (getWorkShiftCatalogOrder(shift.code)
              ? String(getWorkShiftCatalogOrder(shift.code)) + ". "
              : "") +
            shift.code +
            " — " +
            shift.name +
            " (" +
            shift.startTime +
            "–" +
            shift.endTime +
            ")",
        })),
    [shiftsQuery.data],
  );
  /*
   * Ca đã tạm ngưng không còn phân được nên bị loại khỏi danh sách thay vì hiện
   * mờ: danh mục có hàng trăm ca cũ, để lại thì phải lướt qua chúng mới tới được
   * ca đang hoạt động. Ngoại lệ duy nhất là ca đang gán cho chính ô đang mở —
   * giữ lại để ô vẫn cho thấy nó đang là ca gì.
   */
  const pickerCurrentShiftId = cellShiftPicker?.day.shift?.id ?? null;
  const cellShiftOptions = useMemo(
    () =>
      sortWorkShiftCatalog(shiftsQuery.data).filter(
        (shift) =>
          Boolean(shift.startTime && shift.endTime) &&
          (shift.status === "ACTIVE" || shift.id === pickerCurrentShiftId) &&
          includesNormalizedSearch(
            [shift.code, shift.name, shift.groupName ?? ""].join(" "),
            cellShiftSearch,
          ),
      ),
    [cellShiftSearch, pickerCurrentShiftId, shiftsQuery.data],
  );

  const hasActiveDirectShift = useMemo(
    () =>
      (shiftsQuery.data ?? []).some(
        (shift) =>
          Boolean(shift.startTime && shift.endTime) &&
          directCellShiftDisabledReason(shift) === null,
      ),
    [shiftsQuery.data],
  );

  const selectedShift =
    (shiftsQuery.data ?? []).find((shift) => shift.id === shiftId) ?? null;
  const selectedShiftUsesWeekdaySplit = Boolean(
    selectedShift && isFullDayAdministrativeOfficeShift(selectedShift),
  );
  useEffect(() => {
    if (
      didDefaultRequestedShiftScope.current ||
      !requestedShiftId ||
      shiftId !== requestedShiftId ||
      !selectedShiftUsesWeekdaySplit
    ) {
      return;
    }
    didDefaultRequestedShiftScope.current = true;
    setWeekdays((current) =>
      optionalAssignmentWeekdays(current) ? current : [...MONDAY_TO_FRIDAY],
    );
  }, [requestedShiftId, selectedShiftUsesWeekdaySplit, shiftId]);

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
        totals: summarizeAssignmentRow(row.days),
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
  /* Dòng "Tổng cộng" tổng theo các CBNV đang hiển thị trên trang, khớp với những
     gì người dùng đọc được — không phải toàn bộ 70 CBNV của kỳ. */
  const perDayAssigned = useMemo(
    () =>
      summarizeAssignedPerDay(
        pageRows.map((item) => item.row),
        dayMetas.length,
      ),
    [dayMetas.length, pageRows],
  );
  const columnTotals = useMemo(
    () => sumAssignmentTotals(pageRows.map((item) => item.totals)),
    [pageRows],
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
  const cellShiftMutationPending =
    bulkAssign.isPending ||
    cancelShiftAssignmentDay.isPending ||
    replaceShiftAssignmentDay.isPending;

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

  function closeCellShiftPicker() {
    setCellShiftPicker(null);
    setCellShiftCancellation(null);
    setCellShiftCancellationError(null);
    setCellShiftSearch("");
    setCellShiftError(null);
    setCellShiftApplyingId(null);
  }

  function isCellShiftPickerOpen(employeeId: string, date: string): boolean {
    return (
      cellShiftPicker?.employeeId === employeeId &&
      cellShiftPicker.day.date === date
    );
  }

  function openCellShiftPicker(
    row: ShiftAssignmentGridRow,
    day: ShiftAssignmentGridDay,
  ) {
    setCellShiftCancellation(null);
    setCellShiftCancellationError(null);
    setCellShiftPicker((current) =>
      current?.employeeId === row.employeeId && current.day.date === day.date
        ? null
        : {
            employeeId: row.employeeId,
            fullName: row.fullName,
            day,
          },
    );
    setCellShiftSearch("");
    setCellShiftError(null);
  }

  function requestCellShiftCancellation() {
    const picker = cellShiftPicker;
    if (
      !picker ||
      !picker.day.shift ||
      picker.day.source !== "ASSIGNMENT_EMPLOYEE"
    ) {
      return;
    }
    setCellShiftCancellation(picker);
    setCellShiftCancellationError(null);
  }

  function closeCellShiftCancellation() {
    if (cancelShiftAssignmentDay.isPending) return;
    setCellShiftCancellation(null);
    setCellShiftCancellationError(null);
  }

  async function confirmCellShiftCancellation() {
    const cancellation = cellShiftCancellation;
    if (
      !cancellation ||
      !selectedUnitId ||
      !cancellation.day.shift ||
      cancellation.day.source !== "ASSIGNMENT_EMPLOYEE"
    ) {
      return;
    }

    setCellShiftCancellationError(null);
    try {
      await cancelShiftAssignmentDay.mutateAsync({
        month,
        year,
        unitId: selectedUnitId,
        employeeId: cancellation.employeeId,
        date: cancellation.day.date,
      });
      notifications.show({
        color: "green",
        title: "Đã hủy ca làm việc",
        message:
          "Đã hủy " +
          cancellation.day.shift.code +
          " cho " +
          cancellation.fullName +
          " ngày " +
          formatDate(cancellation.day.date) +
          ". BCC hiện có được giữ nguyên.",
      });
      setCellShiftCancellation(null);
      setCellShiftCancellationError(null);
      closeCellShiftPicker();
    } catch (error) {
      setCellShiftCancellationError(
        error instanceof Error && error.message
          ? error.message
          : "Không thể hủy ca. Kiểm tra kỳ công rồi thử lại.",
      );
    }
  }

  async function applyShiftToCell(shift: WorkShift) {
    const picker = cellShiftPicker;
    if (!picker || !selectedUnitId || directCellShiftDisabledReason(shift)) {
      return;
    }

    // Selecting the ca that is already effective is intentionally a no-op.
    // It must never create a duplicate assignment or rewrite BCC.
    if (picker.day.shift?.id === shift.id) {
      closeCellShiftPicker();
      return;
    }

    const replacesExistingAssignment = requiresOneDayShiftOverride(
      picker.day.source,
    );

    setCellShiftError(null);
    setCellShiftApplyingId(shift.id);
    try {
      if (replacesExistingAssignment) {
        await replaceShiftAssignmentDay.mutateAsync({
          month,
          year,
          unitId: selectedUnitId,
          employeeId: picker.employeeId,
          shiftId: shift.id,
          date: picker.day.date,
        });
        notifications.show({
          color: "green",
          title: "Đã đổi ca làm việc",
          message:
            "Đã đổi thành " +
            shift.code +
            " cho " +
            picker.fullName +
            " ngày " +
            formatDate(picker.day.date) +
            ". BCC hiện có được giữ nguyên.",
        });
      } else {
        await bulkAssign.mutateAsync({
          month,
          year,
          unitId: selectedUnitId,
          employeeIds: [picker.employeeId],
          shiftId: shift.id,
          ...singleDayShiftAssignmentScope(picker.day.date),
          includeInTimesheet: true,
        });
        notifications.show({
          color: "green",
          title: "Đã áp ca làm việc",
          message:
            "Đã áp " +
            shift.code +
            " cho " +
            picker.fullName +
            " ngày " +
            formatDate(picker.day.date) +
            " và đưa CBNV vào BCC.",
        });
      }
      closeCellShiftPicker();
    } catch (error) {
      setCellShiftError(
        error instanceof Error && error.message
          ? error.message
          : replacesExistingAssignment
            ? "Không thể đổi ca. Kiểm tra kỳ công hoặc phạm vi áp dụng rồi thử lại."
            : "Không thể áp ca. Kiểm tra kỳ công hoặc ca đang chồng lấn rồi thử lại.",
      );
    } finally {
      setCellShiftApplyingId(null);
    }
  }

  function handleShiftChange(value: string | null) {
    setShiftId(value);
    const selected = (shiftsQuery.data ?? []).find(
      (shift) => shift.id === value,
    );
    if (!selected || !isFullDayAdministrativeOfficeShift(selected)) return;

    // Chỉ thay giá trị mặc định đang là cả tuần; nếu HR đã chọn phạm vi riêng
    // thì phải giữ nguyên lựa chọn đó.
    setWeekdays((current) =>
      optionalAssignmentWeekdays(current) ? current : [...MONDAY_TO_FRIDAY],
    );
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
      <InfoBanner title="Cách phân ca và quan hệ với BCC" collapsible>
        Phân ca ở đây tạo <b>ca cá nhân</b> cho các CBNV được tích chọn; ca cá
        nhân ưu tiên hơn ca phòng ban và đơn vị. Nhấn ô <b>—</b> để chọn ca trực
        tiếp cho đúng CBNV/ngày; thao tác này luôn đưa CBNV vào BCC. Chủ nhật
        mặc định nghỉ; HR chỉ có thể phân ca ngày này khi chủ động chọn ca tại ô
        hoặc chọn Chủ nhật trong phần Ngày áp dụng. Ngày lễ vẫn không áp ca tại
        đây. Mặc định, <b>Áp dụng ca</b> cũng đưa đúng các CBNV đó vào BCC. Bỏ
        chọn “Đưa vào BCC cùng ca” khi chỉ muốn lập kế hoạch ca. Với CBNV đã có
        ca, dùng <b>Đưa vào BCC</b> để bổ sung bảng công mà không tạo lại ca.
        Sau đó mở đúng kỳ, bấm <b>Cập nhật bảng công</b> rồi mới xuất Excel.
      </InfoBanner>

      <FilterBar>
        <Select
          aria-label="Kỳ công"
          data={monthOptions}
          value={String(month)}
          allowDeselect={false}
          onChange={(value) => setMonth(Number(value ?? month))}
          size="sm"
          className={filterStyles.field}
        />
        <Select
          aria-label="Năm"
          data={yearOptions}
          value={String(year)}
          allowDeselect={false}
          onChange={(value) => setYear(Number(value ?? year))}
          size="sm"
          className={filterStyles.field}
        />
        <Select
          aria-label="Đơn vị"
          placeholder="Chọn đơn vị"
          data={unitOptions}
          value={selectedUnitId}
          searchable
          disabled={unitsQuery.isLoading}
          onChange={(value) => {
            setRequestedUnitId(value);
            setDepartmentId(null);
          }}
          size="sm"
          className={filterStyles.fieldWide}
        />
        <Select
          aria-label="Phòng ban"
          placeholder="Tất cả phòng ban"
          data={departmentOptions}
          value={departmentId}
          searchable
          clearable
          disabled={!selectedUnitId || departmentsQuery.isLoading}
          onChange={setDepartmentId}
          size="sm"
          className={filterStyles.fieldWide}
        />
        <TextInput
          aria-label="Nhân sự"
          placeholder="Tìm tên, MCB hoặc mã nhân sự"
          leftSection={<IconSearch size={15} />}
          {...searchInput.inputProps}
          size="sm"
          className={filterStyles.grow}
        />
      </FilterBar>

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
          <b> Đưa vào BCC cùng ca</b> khi áp ca, hoặc dùng nút{" "}
          <b>Đưa vào BCC</b>
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
              onChange={handleShiftChange}
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
            <Stack gap={2} w={294}>
              <WeekdayScopeField
                disabled={tableIsDisabled}
                value={weekdays}
                width="100%"
                onChange={setWeekdays}
              />
              {selectedShiftUsesWeekdaySplit ? (
                <Text size="xs" c="dimmed">
                  Ca hành chính cả ngày mặc định T2–T6. Nếu làm sáng Thứ 7, áp
                  ca Thứ 7 tương ứng (ví dụ HC3/HC4) riêng cho Thứ 7 cùng khoảng
                  ngày, rồi Cập nhật bảng công.
                </Text>
              ) : null}
            </Stack>
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
            <Button
              variant="default"
              size="sm"
              leftSection={<IconCalendarTime size={16} />}
              onClick={() => navigate(ROUTES.weeklyShifts)}
            >
              Ca tuần
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
            lịch sử. Cột (1)–(6) quy số công theo danh mục ca (ca 12 giờ 1.5
            công, ca 24 giờ 3 công) và tính trên lịch đã phân — công chốt cuối kỳ
            vẫn lấy ở Bảng công tháng sau khi có dữ liệu chấm công.
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
                minWidth:
                  fixedColumnsWidth +
                  dayMetas.length * dayColumnWidth +
                  totalColumnsWidth,
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
                  {totalColumns.map((column) => (
                    <Table.Th
                      key={column.key}
                      rowSpan={2}
                      style={{
                        background: "#e6f2df",
                        minWidth: column.width,
                        padding: "5px 4px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        whiteSpace: "pre-line",
                        width: column.width,
                      }}
                    >
                      {column.label}
                    </Table.Th>
                  ))}
                  <Table.Th
                    rowSpan={2}
                    style={{
                      background: "#dcecd2",
                      minWidth: TOTAL_SUM_COLUMN_WIDTH,
                      padding: "5px 4px",
                      textAlign: "center",
                      verticalAlign: "middle",
                      whiteSpace: "pre-line",
                      width: TOTAL_SUM_COLUMN_WIDTH,
                    }}
                  >
                    {"Tổng ngày công\nthực tế\n(6)=(1)+(2)+\n(3)+(4)+(5)"}
                  </Table.Th>
                  {diagnosticColumns.map((column) => (
                    <Table.Th
                      key={column.key}
                      rowSpan={2}
                      style={{
                        background: "#eef2f7",
                        minWidth: column.width,
                        padding: "5px 4px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        whiteSpace: "pre-line",
                        width: column.width,
                      }}
                    >
                      {column.label}
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
                        colSpan={
                          dayMetas.length +
                          totalColumns.length +
                          1 +
                          diagnosticColumns.length
                        }
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
                            const canOpenPicker =
                              canOpenShiftAssignmentGridPicker(
                                day,
                                item.row.canInclude,
                                tableIsDisabled,
                                hasActiveDirectShift,
                              );
                            const isWeeklyTemplateDay =
                              isWeeklyTemplateAssignmentSource(day.source);
                            const isWeeklyTemplateOff =
                              isWeeklyTemplateDay && !day.shift;
                            const replacesExistingShift =
                              requiresOneDayShiftOverride(day.source);
                            const canCancelShift =
                              day.source === "ASSIGNMENT_EMPLOYEE" &&
                              Boolean(day.shift);
                            const cancellationOpen =
                              cellShiftCancellation?.employeeId ===
                                item.row.employeeId &&
                              cellShiftCancellation.day.date === day.date;
                            const pickerOpen =
                              canOpenPicker &&
                              isCellShiftPickerOpen(
                                item.row.employeeId,
                                day.date,
                              );
                            const unavailableCellTitle =
                              tableIsDisabled && grid?.isClosed
                                ? "Kỳ công đã chốt — mở khóa kỳ công trước khi phân ca."
                                : cellDescription(day, hasActiveDirectShift);
                            return (
                              <Table.Td
                                key={meta.day}
                                title={
                                  canOpenPicker
                                    ? undefined
                                    : unavailableCellTitle
                                }
                                style={{
                                  background: visual.background,
                                  minWidth: dayColumnWidth,
                                  padding: canOpenPicker ? 1 : undefined,
                                  textAlign: "center",
                                  width: dayColumnWidth,
                                }}
                              >
                                {canOpenPicker ? (
                                  <Popover
                                    opened={pickerOpen}
                                    onDismiss={closeCellShiftPicker}
                                    position="bottom-start"
                                    shadow="md"
                                    width={720}
                                    withinPortal
                                  >
                                    <Popover.Target>
                                      <button
                                        type="button"
                                        aria-expanded={pickerOpen}
                                        aria-haspopup="dialog"
                                        aria-label={
                                          (isWeeklyTemplateOff
                                            ? "Phân ca ngoại lệ cho "
                                            : replacesExistingShift
                                              ? "Đổi ca cho "
                                              : "Chọn ca cho ") +
                                          item.row.fullName +
                                          ", ngày " +
                                          formatDate(day.date)
                                        }
                                        title={
                                          isWeeklyTemplateOff
                                              ? "Nghỉ theo ca tuần — nhấn để phân ca ngoại lệ cho đúng ngày"
                                              : replacesExistingShift
                                                ? "Nhấn để đổi ca làm việc cho ngày này"
                                              : meta.isSunday
                                                ? "Chủ nhật mặc định nghỉ — nhấn để HR phân ca riêng"
                                                : "Nhấn để chọn ca làm việc cho ngày này"
                                        }
                                        disabled={cellShiftMutationPending}
                                        onClick={() =>
                                          openCellShiftPicker(item.row, day)
                                        }
                                        style={{
                                          alignItems: "center",
                                          background: "transparent",
                                          border: "1px solid transparent",
                                          borderRadius: 4,
                                          cursor: "pointer",
                                          display: "flex",
                                          justifyContent: "center",
                                          minHeight: 30,
                                          padding: 2,
                                          width: "100%",
                                        }}
                                      >
                                        <Text
                                          size="xs"
                                          fw={500}
                                          c={visual.color}
                                          lineClamp={1}
                                        >
                                          {visual.label}
                                        </Text>
                                      </button>
                                    </Popover.Target>
                                    {pickerOpen ? (
                                      <Popover.Dropdown p="sm">
                                        <Stack gap="xs">
                                          <Group
                                            justify="space-between"
                                            align="flex-start"
                                            wrap="nowrap"
                                          >
                                            <Stack gap={0}>
                                              <Text fw={700} size="sm">
                                                {isWeeklyTemplateOff
                                                  ? "Phân ca ngoại lệ cho "
                                                  : replacesExistingShift
                                                    ? "Đổi ca cho "
                                                    : "Chọn ca cho "}
                                                {item.row.fullName}
                                              </Text>
                                              <Text size="xs" c="dimmed">
                                                {isWeeklyTemplateOff
                                                    ? formatDate(day.date) +
                                                      " · Nghỉ theo ca tuần · Tạo ca cá nhân cho đúng ngày, giữ nguyên BCC"
                                                    : replacesExistingShift
                                                      ? formatDate(day.date) +
                                                        " · Ca hiện tại: " +
                                                        (day.shift?.code ?? "—") +
                                                        " · Giữ nguyên BCC"
                                                    : formatDate(day.date) +
                                                      " · Tự đưa vào BCC"}
                                              </Text>
                                            </Stack>
                                            <Group gap={2} wrap="nowrap">
                                              {canCancelShift &&
                                              !cancellationOpen ? (
                                                <Button
                                                  size="compact-xs"
                                                  variant="subtle"
                                                  color="red"
                                                  disabled={cellShiftMutationPending}
                                                  onClick={
                                                    requestCellShiftCancellation
                                                  }
                                                >
                                                  Hủy ca
                                                </Button>
                                              ) : null}
                                              <Button
                                                size="compact-xs"
                                                variant="subtle"
                                                color="gray"
                                                leftSection={<IconX size={14} />}
                                                disabled={cellShiftMutationPending}
                                                onClick={closeCellShiftPicker}
                                              >
                                                Đóng
                                              </Button>
                                            </Group>
                                          </Group>
                                          {cancellationOpen ? (
                                            <Alert color="orange" variant="light">
                                              <Stack gap="xs">
                                                <Text size="xs">
                                                  Hủy ca <b>{day.shift?.code ?? "—"}</b>{" "}
                                                  của <b>{item.row.fullName}</b> ngày{" "}
                                                  <b>{formatDate(day.date)}</b>?
                                                </Text>
                                                <Text size="xs">
                                                  Chỉ hủy ca cá nhân của đúng ngày này. BCC
                                                  hiện có vẫn được giữ nguyên.
                                                </Text>
                                                {cellShiftCancellationError ? (
                                                  <Text size="xs" c="red">
                                                    {cellShiftCancellationError}
                                                  </Text>
                                                ) : null}
                                                <Group justify="flex-end" gap="xs">
                                                  <Button
                                                    size="compact-xs"
                                                    variant="default"
                                                    onClick={closeCellShiftCancellation}
                                                    disabled={
                                                      cancelShiftAssignmentDay.isPending
                                                    }
                                                  >
                                                    Quay lại
                                                  </Button>
                                                  <Button
                                                    size="compact-xs"
                                                    color="red"
                                                    loading={
                                                      cancelShiftAssignmentDay.isPending
                                                    }
                                                    onClick={() =>
                                                      void confirmCellShiftCancellation()
                                                    }
                                                  >
                                                    Hủy ca
                                                  </Button>
                                                </Group>
                                              </Stack>
                                            </Alert>
                                          ) : (
                                            <>
                                          <NormalizedSearchInput
                                            size="xs"
                                            placeholder="Tìm ký hiệu, loại ca hoặc nhóm"
                                            value={cellShiftSearch}
                                            onChange={setCellShiftSearch}
                                          />
                                          {cellShiftError ? (
                                            <Alert
                                              color="red"
                                              variant="light"
                                              p="xs"
                                            >
                                              {cellShiftError}
                                            </Alert>
                                          ) : null}
                                          {shiftsQuery.isError ? (
                                            <Alert
                                              color="red"
                                              variant="light"
                                              p="xs"
                                            >
                                              Không tải được danh mục ca.
                                              <Button
                                                size="compact-xs"
                                                variant="subtle"
                                                onClick={() =>
                                                  void shiftsQuery.refetch()
                                                }
                                              >
                                                Tải lại
                                              </Button>
                                            </Alert>
                                          ) : shiftsQuery.isLoading ? (
                                            <Text size="sm" c="dimmed" py="sm">
                                              Đang tải danh mục ca…
                                            </Text>
                                          ) : cellShiftOptions.length ? (
                                            <ScrollArea.Autosize
                                              mah={280}
                                              type="auto"
                                            >
                                              <Table
                                                withTableBorder
                                                withColumnBorders
                                                horizontalSpacing="xs"
                                                verticalSpacing={4}
                                                style={{ minWidth: 620 }}
                                              >
                                                <Table.Thead>
                                                  <Table.Tr>
                                                    <Table.Th>TT</Table.Th>
                                                    <Table.Th>Ký hiệu</Table.Th>
                                                    <Table.Th>Loại ca</Table.Th>
                                                    <Table.Th>Nhóm</Table.Th>
                                                    <Table.Th>
                                                      Giờ / Công
                                                    </Table.Th>
                                                  </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                  {cellShiftOptions.map(
                                                    (shift) => {
                                                      const disabledReason =
                                                        directCellShiftDisabledReason(
                                                          shift,
                                                        );
                                                      const isCurrentShift =
                                                        replacesExistingShift &&
                                                        day.shift?.id === shift.id;
                                                      const disabled =
                                                        Boolean(
                                                          disabledReason,
                                                        ) ||
                                                        cellShiftMutationPending ||
                                                        isCurrentShift;
                                                      return (
                                                        <Table.Tr
                                                          key={shift.id}
                                                          style={
                                                            isCurrentShift
                                                              ? { background: "#eff6ff" }
                                                              : undefined
                                                          }
                                                        >
                                                          <Table.Td>
                                                            {getWorkShiftCatalogOrder(
                                                              shift.code,
                                                            ) ?? "—"}
                                                          </Table.Td>
                                                          <Table.Td>
                                                            <Button
                                                              size="compact-xs"
                                                              variant={
                                                                isCurrentShift
                                                                  ? "light"
                                                                  : "subtle"
                                                              }
                                                              color={
                                                                isCurrentShift
                                                                  ? "blue"
                                                                  : undefined
                                                              }
                                                              loading={
                                                                cellShiftApplyingId ===
                                                                shift.id
                                                              }
                                                              disabled={
                                                                disabled
                                                              }
                                                              onClick={() =>
                                                                void applyShiftToCell(
                                                                  shift,
                                                                )
                                                              }
                                                            >
                                                              {shift.code}
                                                            </Button>
                                                            {isCurrentShift ? (
                                                              <Badge
                                                                size="xs"
                                                                color="blue"
                                                                variant="light"
                                                              >
                                                                Đang áp dụng
                                                              </Badge>
                                                            ) : null}
                                                            {disabledReason ? (
                                                              <Text
                                                                size="10px"
                                                                c="dimmed"
                                                                lineClamp={1}
                                                              >
                                                                {disabledReason}
                                                              </Text>
                                                            ) : null}
                                                          </Table.Td>
                                                          <Table.Td>
                                                            <Text
                                                              size="xs"
                                                              lineClamp={1}
                                                            >
                                                              {shift.name}
                                                            </Text>
                                                          </Table.Td>
                                                          <Table.Td>
                                                            <Text
                                                              size="xs"
                                                              lineClamp={1}
                                                            >
                                                              {shift.groupName ??
                                                                "—"}
                                                            </Text>
                                                          </Table.Td>
                                                          <Table.Td>
                                                            <Text size="xs">
                                                              {shift.startTime}–
                                                              {shift.endTime}
                                                            </Text>
                                                            <Text
                                                              size="10px"
                                                              c="dimmed"
                                                            >
                                                              {formatShiftHoursAndWorkday(
                                                                shift,
                                                              )}
                                                            </Text>
                                                          </Table.Td>
                                                        </Table.Tr>
                                                      );
                                                    },
                                                  )}
                                                </Table.Tbody>
                                              </Table>
                                            </ScrollArea.Autosize>
                                          ) : (
                                            <Text size="sm" c="dimmed" py="sm">
                                              Không tìm thấy ca phù hợp.
                                            </Text>
                                          )}
                                            </>
                                          )}
                                        </Stack>
                                      </Popover.Dropdown>
                                    ) : null}
                                  </Popover>
                                ) : (
                                  <Text
                                    size="xs"
                                    fw={day.shift ? 700 : 500}
                                    c={visual.color}
                                    lineClamp={1}
                                  >
                                    {visual.label}
                                  </Text>
                                )}
                              </Table.Td>
                            );
                          })}
                          {totalColumns.map((column) => {
                            const value = item.totals[column.key];
                            return (
                              <Table.Td
                                key={column.key}
                                style={{
                                  background: "#fbfdfa",
                                  fontVariantNumeric: "tabular-nums",
                                  padding: "4px 6px",
                                  textAlign: "center",
                                }}
                              >
                                <Text
                                  size="xs"
                                  fw={value > 0 ? 600 : 400}
                                  c={value > 0 ? undefined : "dimmed"}
                                >
                                  {formatWorkdayValue(value)}
                                </Text>
                              </Table.Td>
                            );
                          })}
                          <Table.Td
                            style={{
                              background: "#f1f8ec",
                              fontVariantNumeric: "tabular-nums",
                              padding: "4px 6px",
                              textAlign: "center",
                            }}
                          >
                            <Text size="xs" fw={700}>
                              {formatWorkdayValue(item.totals.totalDays)}
                            </Text>
                          </Table.Td>
                          {diagnosticColumns.map((column) => {
                            const value = item.totals[column.key];
                            const warn =
                              "highlightWhenPositive" in column &&
                              column.highlightWhenPositive &&
                              value > 0;
                            return (
                              <Table.Td
                                key={column.key}
                                style={{
                                  background: warn ? "#fff5f5" : "#f8fafc",
                                  fontVariantNumeric: "tabular-nums",
                                  padding: "4px 6px",
                                  textAlign: "center",
                                }}
                              >
                                <Text
                                  size="xs"
                                  fw={value > 0 ? 600 : 400}
                                  c={
                                    warn
                                      ? "red.7"
                                      : value > 0
                                        ? undefined
                                        : "dimmed"
                                  }
                                >
                                  {value}
                                </Text>
                              </Table.Td>
                            );
                          })}
                        </Table.Tr>
                      );
                    })}
                  </Fragment>
                ))}
                {pageRows.length ? (
                  <Table.Tr>
                    <Table.Td
                      colSpan={fixedColumns.length}
                      style={{
                        background: "#eef2f7",
                        boxShadow: "2px 0 0 var(--mantine-color-gray-4)",
                        fontSize: 12,
                        fontWeight: 700,
                        left: 0,
                        minWidth: fixedColumnsWidth,
                        padding: "6px 10px",
                        position: "sticky",
                        textAlign: "right",
                        width: fixedColumnsWidth,
                        zIndex: 3,
                      }}
                    >
                      Tổng cộng ({pageRows.length} CBNV)
                    </Table.Td>
                    {dayMetas.map((meta, index) => (
                      <Table.Td
                        key={meta.day}
                        style={{
                          background: meta.isSunday ? "#fdf3d8" : "#eef2f7",
                          fontVariantNumeric: "tabular-nums",
                          padding: "6px 2px",
                          textAlign: "center",
                        }}
                      >
                        <Text
                          size="xs"
                          fw={600}
                          c={perDayAssigned[index] ? undefined : "dimmed"}
                        >
                          {formatWorkdayValue(perDayAssigned[index] ?? 0)}
                        </Text>
                      </Table.Td>
                    ))}
                    {totalColumns.map((column) => (
                      <Table.Td
                        key={column.key}
                        style={{
                          background: "#eef2f7",
                          fontVariantNumeric: "tabular-nums",
                          padding: "6px 6px",
                          textAlign: "center",
                        }}
                      >
                        <Text size="xs" fw={700}>
                          {formatWorkdayValue(columnTotals[column.key])}
                        </Text>
                      </Table.Td>
                    ))}
                    <Table.Td
                      style={{
                        background: "#e3ebf3",
                        fontVariantNumeric: "tabular-nums",
                        padding: "6px 6px",
                        textAlign: "center",
                      }}
                    >
                      <Text size="xs" fw={700}>
                        {formatWorkdayValue(columnTotals.totalDays)}
                      </Text>
                    </Table.Td>
                    {diagnosticColumns.map((column) => (
                      <Table.Td
                        key={column.key}
                        style={{
                          background: "#eef2f7",
                          fontVariantNumeric: "tabular-nums",
                          padding: "6px 6px",
                          textAlign: "center",
                        }}
                      >
                        <Text size="xs" fw={700}>
                          {columnTotals[column.key]}
                        </Text>
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ) : null}
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
