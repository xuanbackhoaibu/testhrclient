import { Fragment, memo, useCallback, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDownload,
  IconFilter,
  IconInfoCircle,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import { summarizeBccFromDays } from "../../features/attendance/bccSummary";
import { downloadTimesheetGridExport } from "../../features/attendance/timesheetApi";
import {
  useAdjustTimesheetDay,
  useRecomputeTimesheet,
  useTimesheetGrid,
} from "../../features/attendance/useTimesheet";
import {
  SYMBOL_OPTIONS,
  type TimesheetGridDay,
  type TimesheetGridRow,
} from "../../features/attendance/timesheetTypes";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { PageHeader } from "../../shared/components/PageHeader";

const now = new Date();
const weekdayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Tháng ${index + 1}`,
}));
const yearOptions = Array.from({ length: 5 }, (_, index) => {
  const year = now.getFullYear() - 2 + index;
  return { value: String(year), label: String(year) };
});
const fixedColumns = [
  { key: "number", label: "TT", left: 0, width: 52 },
  { key: "code", label: "Mã nhân viên", left: 52, width: 118 },
  { key: "name", label: "Họ và tên", left: 170, width: 220 },
  { key: "title", label: "Chức vụ", left: 390, width: 185 },
] as const;
const bccTailColumns = [
  { key: "actualWorkDays", label: "Ngày\nlàm việc\nthực tế\n(1)", width: 84 },
  { key: "annualLeaveDays", label: "Nghỉ ngày\nPhép\n(2)", width: 88 },
  { key: "dutyDays", label: "Ngày\ntrực", width: 78 },
  {
    key: "unpaidLeaveDays",
    label: "Ng.nghỉ\nkhông hưởng\nlương\n(Ẩn)",
    width: 94,
    color: "red.8",
  },
  {
    key: "totalActualDays",
    label: "Tổng\nngày công\nthực tế\n(3)=(1)+(2)",
    width: 94,
  },
  {
    key: "annualLeaveUsedToMonth",
    label: "Số ngày phép\nđược sử dụng\nđến tháng",
    width: 96,
  },
  {
    key: "annualLeaveUsedInYear",
    label: "Số ngày phép\nđược sử dụng\ntrong năm",
    width: 96,
  },
  { key: "signature", label: "Ký xác\nnhận", width: 82 },
  { key: "note", label: "Ghi chú\n(Để theo dõi,\nko in cột này)", width: 138 },
] as const;

type BccTailKey = (typeof bccTailColumns)[number]["key"];
const bccTailWidth = bccTailColumns.reduce(
  (total, column) => total + column.width,
  0,
);

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

function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().split("T")[0];
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

function surfaceForSymbol(symbol: string): string | undefined {
  const symbols = symbol.split(";");
  if (symbols.includes("KL")) return "#ff7875";
  if (symbols.some((item) => item === "P" || item === "L")) return "#fff59d";
  if (symbols.some((item) => item === "CT" || item === "BP")) return "#c7e9b4";
  if (symbols.some((item) => ["Ô", "Cô", "TS", "TN", "O"].includes(item))) {
    return "#ffd8a8";
  }
  return undefined;
}

function cellDescription(day: TimesheetGridDay | undefined): string {
  if (!day) return "Chưa tạo dữ liệu ngày công";
  return [
    day.holidayName,
    day.firstPunch && day.lastPunch
      ? `${day.firstPunch}–${day.lastPunch}`
      : null,
    day.lateMinutes > 0 ? `Muộn ${day.lateMinutes}'` : null,
    day.earlyLeaveMinutes > 0 ? `Về sớm ${day.earlyLeaveMinutes}'` : null,
    day.needsExplanation ? "Chờ giải trình" : null,
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
    annualLeaveDays: bcc.annualLeaveDays,
    dutyDays: bcc.dutyDays,
    unpaidLeaveDays: bcc.unpaidLeaveDays,
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
}: {
  item: PreparedTimesheetRow;
  employeeNumber: number;
  dayMetas: DayMeta[];
  canEdit: boolean;
  onOpenCell: (row: TimesheetGridRow, day: TimesheetGridDay) => void;
}) {
  const { row, daysByNumber } = item;

  return (
    <Table.Tr>
      <Table.Td style={{ ...fixedStyle(0, 52), textAlign: "center" }}>
        {employeeNumber}
      </Table.Td>
      <Table.Td style={fixedStyle(52, 118)}>
        <Text size="sm" fw={600}>
          {row.employeeCode}
        </Text>
      </Table.Td>
      <Table.Td style={fixedStyle(170, 220)}>
        <Text size="sm" fw={600}>
          {row.fullName}
        </Text>
      </Table.Td>
      <Table.Td style={fixedStyle(390, 185)}>
        {row.jobTitle ? (
          <Text size="sm">{row.jobTitle}</Text>
        ) : (
          <Badge size="sm" color="orange" variant="light">
            Chưa gán chức vụ
          </Badge>
        )}
      </Table.Td>
      {dayMetas.map((meta) => {
        const day = daysByNumber.get(meta.day);
        const label = day?.displaySymbol || "";
        const background = !day?.isWorkingDay
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
                : day?.needsExplanation
                  ? "#fee2e2"
                  : day?.lateMinutes
                    ? "#ffedd5"
                    : undefined));
        const isEditable = canEdit && day !== undefined && !day.isLocked;

        return (
          <Table.Td
            key={meta.day}
            title={cellDescription(day)}
            style={{
              minWidth: 52,
              textAlign: "center",
              background,
              cursor: isEditable ? "pointer" : "default",
            }}
            onClick={() => day && onOpenCell(row, day)}
          >
            <Text
              fw={label ? 700 : undefined}
              size="sm"
              c={label.includes("KL") ? "red.9" : undefined}
            >
              {label || (day?.needsExplanation ? "?" : "·")}
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
              size="sm"
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
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);
  const canExport = can(HR_PERMISSIONS.ATTENDANCE_EXPORT);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [scopeModalOpened, setScopeModalOpened] = useState(false);
  const [draftDepartmentIds, setDraftDepartmentIds] = useState<string[]>([]);
  const [draftUnitIds, setDraftUnitIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editSymbol, setEditSymbol] = useState<string | null>(null);
  const [editPortion, setEditPortion] = useState(1);
  const [editReason, setEditReason] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const departmentsQuery = useDepartmentsSelect();
  const unitsQuery = useUnitsSelect();
  const query = useMemo(
    () => ({
      month,
      year,
      departmentIds: departmentIds.length ? departmentIds : undefined,
      unitIds: unitIds.length ? unitIds : undefined,
    }),
    [departmentIds, month, unitIds, year],
  );
  const gridQuery = useTimesheetGrid(query);
  const adjustDay = useAdjustTimesheetDay();
  const recompute = useRecomputeTimesheet();
  const rows = useMemo(
    () => gridQuery.data?.rows ?? [],
    [gridQuery.data?.rows],
  );
  const dayMetas = useMemo(
    () =>
      Array.from({ length: gridQuery.data?.daysInMonth ?? 31 }, (_, index) =>
        makeDayMeta(year, month, index + 1),
      ),
    [gridQuery.data?.daysInMonth, month, year],
  );

  const unitNameById = useMemo(
    () => new Map((unitsQuery.data ?? []).map((unit) => [unit.id, unit.name])),
    [unitsQuery.data],
  );
  const unitOptions = useMemo(
    () =>
      (unitsQuery.data ?? []).map((unit) => ({
        value: unit.id,
        label: unit.shortName ? `${unit.name} (${unit.shortName})` : unit.name,
      })),
    [unitsQuery.data],
  );
  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((department) => ({
        value: department.id,
        label: unitNameById.get(department.unitId)
          ? `${department.name} (${unitNameById.get(department.unitId)})`
          : department.name,
      })),
    [departmentsQuery.data, unitNameById],
  );
  const preparedRows = useMemo<PreparedTimesheetRow[]>(
    () =>
      rows.map((row) => ({
        row,
        daysByNumber: new Map(row.days.map((day) => [day.day, day])),
      })),
    [rows],
  );
  const groupedRows = useMemo(() => {
    const groups = new Map<string, PreparedTimesheetRow[]>();
    [...preparedRows]
      .sort(
        (left, right) =>
          departmentGroupLabel(left.row).localeCompare(
            departmentGroupLabel(right.row),
            "vi",
          ) ||
          left.row.employeeCode.localeCompare(right.row.employeeCode, "vi"),
      )
      .forEach((item) => {
        const label = departmentGroupLabel(item.row);
        groups.set(label, [...(groups.get(label) ?? []), item]);
      });
    let startIndex = 0;
    return [...groups.entries()].map(([label, groupRows]) => {
      const group = { label, rows: groupRows, startIndex };
      startIndex += groupRows.length;
      return group;
    });
  }, [preparedRows]);
  const scopeLabel = useMemo(() => {
    if (!unitIds.length && !departmentIds.length) return "Toàn công ty";
    return [
      unitIds.length ? `${unitIds.length} công ty/đơn vị` : null,
      departmentIds.length ? `${departmentIds.length} phòng ban` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [departmentIds.length, unitIds.length]);

  const openCell = useCallback(
    (row: TimesheetGridRow, day: TimesheetGridDay) => {
      if (!canEdit || day.isLocked) return;
      setEditing({ row, day });
      setEditSymbol(day.displaySymbol.split(";")[0] || null);
      setEditPortion(day.paidDays || 1);
      setEditReason("");
    },
    [canEdit],
  );

  function openScopeModal() {
    setDraftUnitIds(unitIds);
    setDraftDepartmentIds(departmentIds);
    setScopeModalOpened(true);
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
    if (!editing) return;
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

  async function handleRecompute() {
    try {
      const result = await recompute.mutateAsync({
        fromDate: `${year}-${String(month).padStart(2, "0")}-01`,
        toDate: lastDayOfMonth(year, month),
      });
      notifications.show({
        color: "green",
        title: `Đã cập nhật ${result.processed} ô ngày công`,
        message:
          result.skippedLocked + result.skippedAdjusted > 0
            ? `Giữ nguyên ${result.skippedLocked} ngày đã chốt và ${result.skippedAdjusted} ngày HR đã sửa tay.`
            : "Bảng công đã được tạo đủ ngày cho toàn bộ nhân sự đang làm việc.",
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Không tính lại được",
        message: "Vui lòng thử lại sau.",
      });
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadTimesheetGridExport(query);
      notifications.show({
        color: "green",
        title: "Đã xuất Excel",
        message: "File BCC được tải xuống theo đúng phạm vi đang chọn.",
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
        title="Bảng chấm công tháng"
        subtitle="Theo dõi theo công ty, phòng ban và nhân viên; chức vụ lấy từ phân công hiệu lực trong kỳ."
        actions={
          canEdit || canExport ? (
            <Group gap="xs">
              {canExport ? (
                <Button
                  variant="default"
                  leftSection={<IconDownload size={18} />}
                  loading={isExporting}
                  onClick={() => void handleExport()}
                >
                  Xuất Excel
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  leftSection={<IconRefresh size={18} />}
                  loading={recompute.isPending}
                  onClick={() => void handleRecompute()}
                >
                  Cập nhật bảng công
                </Button>
              ) : null}
            </Group>
          ) : null
        }
      />

      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
          Giờ hành chính <b>08:00–17:30</b>; chỉ check-in <b>sau 08:15</b> mới
          tính đi muộn. Thứ Bảy làm buổi sáng <b>08:00–12:00</b>. Ô “Chưa gán
          chức vụ” là hồ sơ chưa có phân công/chức danh hiệu lực.
        </Alert>

        <Paper withBorder radius="md" p="sm" shadow="xs">
          <Group justify="space-between" align="end" wrap="wrap">
            <Group align="end" gap="sm">
              <Select
                label="Kỳ công"
                w={142}
                data={monthOptions}
                value={String(month)}
                onChange={(value) => setMonth(Number(value ?? 1))}
              />
              <Select
                label="Năm"
                w={112}
                data={yearOptions}
                value={String(year)}
                onChange={(value) =>
                  setYear(Number(value ?? now.getFullYear()))
                }
              />
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  Phạm vi xem & xuất
                </Text>
                <Button
                  variant="default"
                  leftSection={<IconFilter size={16} />}
                  onClick={openScopeModal}
                >
                  {scopeLabel}
                </Button>
              </Stack>
            </Group>
            <Group gap="xs" pb={4}>
              <Badge variant="light" color="violet">
                {scopeLabel}
              </Badge>
              <Text size="sm" c="dimmed">
                {rows.length} nhân viên · {groupedRows.length} nhóm
              </Text>
            </Group>
          </Group>
        </Paper>

        {gridQuery.isLoading ? (
          <Text c="dimmed">Đang tải bảng công…</Text>
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
          <ScrollArea type="auto" offsetScrollbars>
            <Table
              withTableBorder
              highlightOnHover
              stickyHeader
              stickyHeaderOffset={0}
              style={{ minWidth: 575 + dayMetas.length * 52 + bccTailWidth }}
            >
              <Table.Thead>
                <Table.Tr>
                  {fixedColumns.map((column) => (
                    <Table.Th
                      key={column.key}
                      rowSpan={2}
                      style={{
                        ...fixedStyle(column.left, column.width, true),
                        textAlign: column.key === "number" ? "center" : "left",
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
                        minWidth: 52,
                        textAlign: "center",
                        background: meta.isSunday ? "#ffe7a6" : "#e6f2df",
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
                        minWidth: 52,
                        textAlign: "center",
                        background: meta.isSunday ? "#ffe7a6" : "#e6f2df",
                      }}
                    >
                      {meta.label}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {groupedRows.map((group, groupIndex) => (
                  <Fragment key={group.label}>
                    <Table.Tr>
                      <Table.Td
                        colSpan={
                          fixedColumns.length +
                          dayMetas.length +
                          bccTailColumns.length
                        }
                        style={{ background: "#d9d2e9", fontWeight: 700 }}
                      >
                        {groupIndex + 1}. {group.label}{" "}
                        <Text component="span" size="sm" c="dimmed">
                          ({group.rows.length} nhân viên)
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                    {group.rows.map((item, rowIndex) => (
                      <TimesheetDataRow
                        key={item.row.employeeId}
                        item={item}
                        employeeNumber={group.startIndex + rowIndex + 1}
                        dayMetas={dayMetas}
                        canEdit={canEdit}
                        onOpenCell={openCell}
                      />
                    ))}
                  </Fragment>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
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
            chọn nhiều đơn vị và phòng ban; kết quả được gộp trong một bảng
            công, phân nhóm rõ theo đơn vị/phòng ban.
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
                      onChange={() =>
                        toggleDraftSelection(
                          option.value,
                          draftUnitIds,
                          setDraftUnitIds,
                        )
                      }
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
                  {departmentOptions.map((option) => (
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
                  setDepartmentIds(draftDepartmentIds);
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
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing
            ? `Sửa ô: ${editing.row.fullName} — ngày ${editing.day.date}`
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
            disabled={!editSymbol}
          />
          <Textarea
            label="Lý do sửa"
            description="Bắt buộc — được lưu để đối chiếu khi có khiếu nại"
            withAsterisk
            minRows={2}
            value={editReason}
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
