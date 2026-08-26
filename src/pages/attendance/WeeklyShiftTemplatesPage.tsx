import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
  Group,
  Modal,
  MultiSelect,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarTime,
  IconEdit,
  IconInfoCircle,
  IconPlus,
  IconTrash,
  IconUsers,
  IconSearch,
} from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  useApplyWeeklyShiftTemplate,
  useCancelWeeklyShiftAssignments,
  useCreateWeeklyShiftTemplate,
  useDeleteWeeklyShiftTemplate,
  useUpdateWeeklyShiftTemplate,
  useWeeklyShiftTemplates,
  useWeeklyShiftAssignments,
  useWorkShifts,
} from "../../features/attendance/useWorkSchedule";
import {
  getWorkShiftCatalogOrder,
  sortWorkShiftCatalog,
} from "../../features/attendance/workShiftCatalogOrder";
import {
  WEEKDAY_LABELS,
  type WeeklyShiftTemplate,
  type WeeklyShiftAssignment,
  type WeeklyShiftTemplatePayload,
} from "../../features/attendance/workScheduleTypes";
import { useAllEmployees } from "../../features/employees/useEmployees";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { HrmDateInput } from "../../shared/components/HrmDateInput";
import { PageHeader } from "../../shared/components/PageHeader";
import { SectionCard } from "../../shared/components/SectionCard";
import { formatDate } from "../../shared/utils/date";
import { isoMonthEnd, isoMonthStart } from "../../shared/utils/date";

const WEEKDAY_EDITOR_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEKDAY_API_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;
const OFF_VALUE = "__WEEKLY_SHIFT_OFF__";
const EMPTY_TEMPLATES: WeeklyShiftTemplate[] = [];
const now = new Date();

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Tháng ${index + 1}`,
}));
const yearOptions = Array.from({ length: 7 }, (_, index) => {
  const year = now.getFullYear() - 2 + index;
  return { value: String(year), label: String(year) };
});

function emptyWeekdays(): Record<number, string | null> {
  return Object.fromEntries(
    WEEKDAY_API_ORDER.map((weekday) => [weekday, null]),
  ) as Record<number, string | null>;
}

function templateWeekdays(
  template: WeeklyShiftTemplate | null,
): Record<number, string | null> {
  const days = emptyWeekdays();
  for (const day of template?.days ?? []) {
    days[day.weekday] = day.shiftId;
  }
  return days;
}

function templateDay(
  template: WeeklyShiftTemplate,
  weekday: number,
): WeeklyShiftTemplate["days"][number] | undefined {
  return template.days.find((day) => day.weekday === weekday);
}

function templateDayLabel(template: WeeklyShiftTemplate, weekday: number): string {
  return templateDay(template, weekday)?.shift?.code ?? "Nghỉ";
}

function templateDayDescription(
  template: WeeklyShiftTemplate,
  weekday: number,
): string {
  const shift = templateDay(template, weekday)?.shift;
  if (!shift) return "Nghỉ theo ca";
  const time = shift.startTime && shift.endTime
    ? ` · ${shift.startTime}–${shift.endTime}`
    : "";
  return `${shift.code} — ${shift.name}${time}`;
}

function statusColor(status: WeeklyShiftTemplate["status"]): string {
  return status === "ACTIVE" ? "green" : "gray";
}

function formatApplySuccess(
  template: WeeklyShiftTemplate,
  result: {
    created: number;
    includedInTimesheet: number;
    replacedWeeklyAssignments: number;
    replacedDirectAssignments: number;
    preservedDayOverrides: number;
  },
  includeInTimesheet: boolean,
): string {
  const parts = [`Đã áp mẫu “${template.name}” cho ${result.created} CBNV.`];
  if (includeInTimesheet) {
    parts.push(`Đã đưa ${result.includedInTimesheet} CBNV vào BCC.`);
  } else {
    parts.push("BCC giữ nguyên theo lựa chọn của HR.");
  }
  if (result.replacedWeeklyAssignments) {
    parts.push(
      `Đã tách/thay thế ${result.replacedWeeklyAssignments} lịch Ca tuần chồng khoảng.`,
    );
  }
  if (result.replacedDirectAssignments) {
    parts.push(
      `Đã thay thế ${result.replacedDirectAssignments} phân ca cá nhân chồng khoảng.`,
    );
  }
  if (result.preservedDayOverrides) {
    parts.push(
      `Giữ nguyên ${result.preservedDayOverrides} chỉnh sửa ca theo ngày.`,
    );
  }
  return parts.join(" ");
}

interface WeeklyShiftAssignmentsPanelProps {
  template: WeeklyShiftTemplate;
  canEdit: boolean;
}

function yearMonthFromIso(value: string): { year: number; month: number } {
  return {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)),
  };
}

const ASSIGNMENTS_PAGE_SIZE = 10;

function WeeklyShiftAssignmentsPanel({
  template,
  canEdit,
}: WeeklyShiftAssignmentsPanelProps) {
  const unitsQuery = useUnitsSelect();
  const assignmentsQuery = useWeeklyShiftAssignments({ templateId: template.id });
  const cancelAssignments = useCancelWeeklyShiftAssignments();
  // The endpoint returns every assignment at once, so the list is paged here
  // instead of rendering hundreds of rows down the page.
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<WeeklyShiftAssignment | null>(
    null,
  );
  const [cancelMonth, setCancelMonth] = useState(now.getMonth() + 1);
  const [cancelYear, setCancelYear] = useState(now.getFullYear());
  const [cancelFrom, setCancelFrom] = useState("");
  const [cancelTo, setCancelTo] = useState("");
  const cancelPeriodStart = isoMonthStart(cancelYear, cancelMonth);
  const cancelPeriodEnd = isoMonthEnd(cancelYear, cancelMonth);
  const cancelRangeStart =
    cancelling && cancelling.effectiveFrom > cancelPeriodStart
      ? cancelling.effectiveFrom
      : cancelPeriodStart;
  const cancelRangeEnd =
    cancelling?.effectiveTo && cancelling.effectiveTo < cancelPeriodEnd
      ? cancelling.effectiveTo
      : cancelPeriodEnd;
  const allAssignments = useMemo(
    () => assignmentsQuery.data ?? [],
    [assignmentsQuery.data],
  );

  const filteredAssignments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return allAssignments;
    return allAssignments.filter((assignment) => {
      const name = assignment.employee?.fullName?.toLowerCase() ?? "";
      const code = assignment.employee?.employeeCode?.toLowerCase() ?? "";
      return name.includes(keyword) || code.includes(keyword);
    });
  }, [allAssignments, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssignments.length / ASSIGNMENTS_PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const pagedAssignments = useMemo(
    () =>
      filteredAssignments.slice(
        (currentPage - 1) * ASSIGNMENTS_PAGE_SIZE,
        currentPage * ASSIGNMENTS_PAGE_SIZE,
      ),
    [filteredAssignments, currentPage],
  );
  const assignmentsMeta = {
    page: currentPage,
    pageSize: ASSIGNMENTS_PAGE_SIZE,
    total: filteredAssignments.length,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };

  const cancelUnit = useMemo(
    () =>
      (unitsQuery.data ?? []).find((unit) => unit.id === cancelling?.unitId) ??
      null,
    [cancelling?.unitId, unitsQuery.data],
  );
  const cancelUnitLabel = cancelUnit
    ? `${cancelUnit.code} — ${cancelUnit.name}`
    : cancelling?.unitId ?? "";
  function openCancel(assignment: WeeklyShiftAssignment) {
    const { month, year } = yearMonthFromIso(assignment.effectiveFrom);
    const periodEnd = isoMonthEnd(year, month);
    setCancelMonth(month);
    setCancelYear(year);
    setCancelFrom(assignment.effectiveFrom);
    setCancelTo(
      assignment.effectiveTo && assignment.effectiveTo < periodEnd
        ? assignment.effectiveTo
        : periodEnd,
    );
    setCancelling(assignment);
  }

  async function submitCancellation() {
    if (!cancelling?.unitId) {
      notifications.show({
        color: "yellow",
        title: "Thiếu đơn vị gốc",
        message: "Không thể xác định đơn vị lúc áp ca tuần để hủy an toàn.",
      });
      return;
    }
    if (
      !cancelFrom ||
      !cancelTo ||
      cancelFrom < cancelRangeStart ||
      cancelTo > cancelRangeEnd ||
      cancelTo < cancelFrom
    ) {
      notifications.show({
        color: "yellow",
        title: "Khoảng ngày chưa hợp lệ",
        message: "Chỉ hủy trong đúng Kỳ công và khoảng hiệu lực của lịch đã chọn; ngày kết thúc không được trước ngày bắt đầu.",
      });
      return;
    }

    try {
      const result = await cancelAssignments.mutateAsync({
        month: cancelMonth,
        year: cancelYear,
        unitId: cancelling.unitId,
        employeeIds: [cancelling.employee.id],
        assignmentIds: [cancelling.id],
        effectiveFrom: cancelFrom,
        effectiveTo: cancelTo,
      });
      notifications.show({
        color: "green",
        title: "Đã hủy ca tuần trong khoảng chọn",
        message:
          result.changed > 0
            ? `Đã hủy/tách ${result.changed} lịch Ca tuần. BCC và chỉnh sửa ca theo ngày được giữ nguyên.`
            : "Không có lịch Ca tuần nào thay đổi trong khoảng đã chọn.",
      });
      setCancelling(null);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không thể hủy ca tuần",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Kiểm tra Kỳ công, đơn vị và khoảng hiệu lực rồi thử lại.",
      });
    }
  }

  const columns: DataTableColumn<WeeklyShiftAssignment>[] = [
    {
      key: "employee",
      header: "Nhân sự",
      minWidth: 220,
      render: (assignment) => (
        <Stack gap={1}>
          <Text fw={600}>{assignment.employee.fullName}</Text>
          <Text size="xs" c="dimmed">
            {assignment.employee.employeeCode}
          </Text>
        </Stack>
      ),
    },
    {
      key: "range",
      header: "Khoảng hiệu lực",
      minWidth: 190,
      render: (assignment) => (
        <Text size="sm">
          {formatDate(assignment.effectiveFrom)} – {formatDate(assignment.effectiveTo)}
        </Text>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      width: 112,
      align: "center",
      render: (assignment) => (
        <Badge color={statusColor(assignment.status)} variant="light">
          {assignment.status === "ACTIVE" ? "ĐANG DÙNG" : "TẠM NGƯNG"}
        </Badge>
      ),
    },
    {
      key: "note",
      header: "Ghi chú",
      minWidth: 180,
      render: (assignment) => (
        <Text size="sm" c={assignment.note ? undefined : "dimmed"} lineClamp={1}>
          {assignment.note || "—"}
        </Text>
      ),
    },
    {
      key: "actions",
      header: "",
      width: 142,
      align: "right",
      render: (assignment) => (
        <Button
          size="compact-xs"
          variant="subtle"
          color="red"
          disabled={!canEdit || assignment.status !== "ACTIVE"}
          onClick={() => openCancel(assignment)}
        >
          Hủy trong kỳ
        </Button>
      ),
    },
  ];

  return (
    <>
      <SectionCard
        title="Lịch Ca tuần đã áp dụng"
        count={`${allAssignments.length} lịch`}
        description={
          expanded
            ? `Chỉ hiển thị lịch đã áp của mẫu “${template.name}”. Hủy theo khoảng chỉ tách/xóa lịch Ca tuần trong kỳ, không xóa BCC hay ngoại lệ theo ngày.`
            : undefined
        }
        actions={
          <Button
            size="xs"
            variant={expanded ? "subtle" : "light"}
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "Thu gọn" : "Xem danh sách"}
          </Button>
        }
        flushHeader={!expanded}
      >
        {expanded && (
          <Stack gap="xs" p="sm" pt={0}>
            <TextInput
              placeholder="Tìm theo tên hoặc mã nhân sự..."
              leftSection={<IconSearch size={15} />}
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              size="sm"
              maw={320}
            />
            <DataTable
              data={pagedAssignments}
              columns={columns}
              rowKey={(assignment) => assignment.id}
              loading={assignmentsQuery.isLoading}
              error={assignmentsQuery.error}
              onRetry={() => void assignmentsQuery.refetch()}
              meta={assignmentsMeta}
              onPageChange={(nextPage) => setPage(nextPage)}
              emptyTitle={
                search ? "Không tìm thấy nhân sự" : "Mẫu này chưa được áp dụng"
              }
              emptyDescription={
                search
                  ? "Thử từ khóa khác hoặc xóa ô tìm kiếm."
                  : "Áp ca tuần cho CBNV để tạo lịch có thể kiểm tra và hủy theo đúng khoảng hiệu lực."
              }
            />
          </Stack>
        )}
      </SectionCard>

      <Modal
        opened={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        title={cancelling ? `Hủy ca tuần cho ${cancelling.employee.fullName}` : "Hủy ca tuần"}
        centered
      >
        <Stack gap="md">
          <Alert color="orange" variant="light">
            Hủy chỉ tác động Ca tuần của đúng CBNV trong phạm vi đã chọn. BCC và
            các chỉnh sửa ca đúng một ngày vẫn được giữ nguyên.
          </Alert>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Select
              label="Kỳ công"
              data={monthOptions}
              value={String(cancelMonth)}
              allowDeselect={false}
              disabled
              onChange={(value) => setCancelMonth(Number(value ?? cancelMonth))}
            />
            <Select
              label="Năm"
              data={yearOptions}
              value={String(cancelYear)}
              allowDeselect={false}
              disabled
              onChange={(value) => setCancelYear(Number(value ?? cancelYear))}
            />
            <TextInput
              label="Đơn vị gốc"
              description="Đơn vị khi áp ca tuần, được khóa để giữ đúng lịch sử."
              value={cancelUnitLabel}
              readOnly
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <HrmDateInput
              label="Từ ngày"
              clearable={false}
              minDate={cancelRangeStart}
              maxDate={cancelRangeEnd}
              value={cancelFrom}
              disabled={cancelAssignments.isPending}
              onChange={(value) => setCancelFrom(value ?? cancelRangeStart)}
            />
            <HrmDateInput
              label="Đến ngày"
              clearable={false}
              minDate={cancelFrom || cancelRangeStart}
              maxDate={cancelRangeEnd}
              value={cancelTo}
              disabled={cancelAssignments.isPending}
              onChange={(value) => setCancelTo(value ?? cancelRangeEnd)}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelling(null)}>
              Đóng
            </Button>
            <Button
              color="red"
              loading={cancelAssignments.isPending}
              disabled={!canEdit || !cancelling?.unitId}
              onClick={() => void submitCancellation()}
            >
              Hủy ca tuần
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export function WeeklyShiftTemplatesPage() {
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);
  const templatesQuery = useWeeklyShiftTemplates();
  const shiftsQuery = useWorkShifts();
  const unitsQuery = useUnitsSelect();
  const createTemplate = useCreateWeeklyShiftTemplate();
  const updateTemplate = useUpdateWeeklyShiftTemplate();
  const deleteTemplate = useDeleteWeeklyShiftTemplate();
  const applyTemplateMutation = useApplyWeeklyShiftTemplate();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [editorOpened, setEditorOpened] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<WeeklyShiftTemplate | null>(null);
  const [editorName, setEditorName] = useState("");
  const [editorNote, setEditorNote] = useState("");
  const [editorDays, setEditorDays] = useState<Record<number, string | null>>(
    emptyWeekdays,
  );
  const [deletingTemplate, setDeletingTemplate] =
    useState<WeeklyShiftTemplate | null>(null);
  const [applyTemplate, setApplyTemplate] =
    useState<WeeklyShiftTemplate | null>(null);
  const [applyMonth, setApplyMonth] = useState(now.getMonth() + 1);
  const [applyYear, setApplyYear] = useState(now.getFullYear());
  const [applyUnitId, setApplyUnitId] = useState<string | null>(null);
  const [applyEmployeeIds, setApplyEmployeeIds] = useState<string[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState(
    isoMonthStart(now.getFullYear(), now.getMonth() + 1),
  );
  const [effectiveTo, setEffectiveTo] = useState(
    isoMonthEnd(now.getFullYear(), now.getMonth() + 1),
  );
  const [includeInTimesheet, setIncludeInTimesheet] = useState(true);
  const [applyNote, setApplyNote] = useState("");

  const templates = templatesQuery.data ?? EMPTY_TEMPLATES;
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ??
    templates[0] ??
    null;
  const periodStart = isoMonthStart(applyYear, applyMonth);
  const periodEnd = isoMonthEnd(applyYear, applyMonth);

  const activeShifts = useMemo(
    () =>
      sortWorkShiftCatalog(shiftsQuery.data).filter(
        (shift) =>
          shift.status === "ACTIVE" &&
          Boolean(shift.startTime && shift.endTime) &&
          shift.startTime < shift.endTime,
      ),
    [shiftsQuery.data],
  );
  const shiftOptions = useMemo(
    () => [
      { value: OFF_VALUE, label: "Nghỉ (không kế thừa ca khác)" },
      ...activeShifts.map((shift) => ({
        value: shift.id,
        label: `${getWorkShiftCatalogOrder(shift.code) ?? "—"}. ${shift.code} — ${shift.name} (${shift.startTime}–${shift.endTime})`,
      })),
    ],
    [activeShifts],
  );
  const unitOptions = useMemo(
    () =>
      (unitsQuery.data ?? []).map((unit) => ({
        value: unit.id,
        label: `${unit.code} — ${unit.name}`,
      })),
    [unitsQuery.data],
  );
  const resolvedApplyUnitId = applyUnitId ?? unitOptions[0]?.value ?? null;
  const employeesQuery = useAllEmployees(
    { unitId: resolvedApplyUnitId ?? undefined },
    { enabled: Boolean(applyTemplate && resolvedApplyUnitId) },
  );
  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data ?? []).map((employee) => ({
        value: employee.id,
        label: `${employee.biotimeEmployeeCode ?? employee.employeeCode} — ${employee.fullName}`,
      })),
    [employeesQuery.data],
  );


  function updateApplyPeriod(nextMonth: number, nextYear: number) {
    setApplyMonth(nextMonth);
    setApplyYear(nextYear);
    setEffectiveFrom(isoMonthStart(nextYear, nextMonth));
    setEffectiveTo(isoMonthEnd(nextYear, nextMonth));
  }

  function openCreate() {
    setEditingTemplate(null);
    setEditorName("");
    setEditorNote("");
    setEditorDays(emptyWeekdays());
    setEditorOpened(true);
  }

  function openEdit(template: WeeklyShiftTemplate) {
    setEditingTemplate(template);
    setEditorName(template.name);
    setEditorNote(template.note ?? "");
    setEditorDays(templateWeekdays(template));
    setEditorOpened(true);
  }

  function closeEditor() {
    if (createTemplate.isPending || updateTemplate.isPending) return;
    setEditorOpened(false);
    setEditingTemplate(null);
  }

  function setEditorDay(weekday: number, value: string | null) {
    setEditorDays((current) => ({
      ...current,
      [weekday]: value === OFF_VALUE || !value ? null : value,
    }));
  }

  async function saveTemplate() {
    const name = editorName.trim();
    if (!name) {
      notifications.show({
        color: "yellow",
        title: "Chưa nhập tên ca tuần",
        message: "Nhập tên để HR có thể nhận ra mẫu ca này khi áp dụng.",
      });
      return;
    }

    const payload: WeeklyShiftTemplatePayload = {
      name,
      note: editorNote.trim() || null,
      days: WEEKDAY_API_ORDER.map((weekday) => ({
        weekday,
        shiftId: editorDays[weekday] ?? null,
      })),
    };

    try {
      const saved = editingTemplate
        ? await updateTemplate.mutateAsync({ id: editingTemplate.id, payload })
        : await createTemplate.mutateAsync(payload);
      setSelectedTemplateId(saved.id);
      notifications.show({
        color: "green",
        title: editingTemplate ? "Đã cập nhật ca tuần" : "Đã tạo ca tuần",
        message: editingTemplate
          ? "Thay đổi chỉ dùng cho lần áp dụng sau. Ca tuần đã áp dụng trước đó vẫn giữ snapshot cũ."
          : "Chọn mẫu này rồi áp dụng cho một hoặc nhiều CBNV trong kỳ công.",
      });
      setEditorOpened(false);
      setEditingTemplate(null);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không lưu được ca tuần",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Kiểm tra tên mẫu, 7 ngày trong tuần và trạng thái kỳ công rồi thử lại.",
      });
    }
  }

  function openApply(template: WeeklyShiftTemplate) {
    setApplyTemplate(template);
    setApplyEmployeeIds([]);
    setIncludeInTimesheet(true);
    setApplyNote("");
  }

  function closeApply() {
    if (applyTemplateMutation.isPending) return;
    setApplyTemplate(null);
  }

  async function applyWeeklyTemplate() {
    if (!applyTemplate || !resolvedApplyUnitId) {
      notifications.show({
        color: "yellow",
        title: "Chưa chọn đơn vị",
        message: "Chọn đơn vị trước khi áp ca tuần.",
      });
      return;
    }
    if (!applyEmployeeIds.length) {
      notifications.show({
        color: "yellow",
        title: "Chưa chọn CBNV",
        message: "Tích chọn ít nhất một CBNV để áp dụng ca tuần.",
      });
      return;
    }
    if (
      !effectiveFrom ||
      !effectiveTo ||
      effectiveFrom < periodStart ||
      effectiveTo > periodEnd ||
      effectiveTo < effectiveFrom
    ) {
      notifications.show({
        color: "yellow",
        title: "Khoảng ngày chưa hợp lệ",
        message: "Ngày áp dụng phải nằm trong Kỳ công đã chọn và ngày kết thúc không được trước ngày bắt đầu.",
      });
      return;
    }

    try {
      const result = await applyTemplateMutation.mutateAsync({
        month: applyMonth,
        year: applyYear,
        unitId: resolvedApplyUnitId,
        templateId: applyTemplate.id,
        employeeIds: applyEmployeeIds,
        effectiveFrom,
        effectiveTo,
        ...(applyNote.trim() ? { note: applyNote.trim() } : {}),
        overwriteExisting: true,
        ...(includeInTimesheet ? {} : { includeInTimesheet: false }),
      });
      notifications.show({
        color: "green",
        title: "Đã áp ca tuần",
        message: formatApplySuccess(applyTemplate, result, includeInTimesheet),
        autoClose: 8000,
      });
      setApplyTemplate(null);
      setApplyEmployeeIds([]);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Chưa thể áp ca tuần",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Kiểm tra kỳ công, khoảng ngày và ca cá nhân chồng lấn rồi thử lại.",
      });
    }
  }

  async function removeTemplate() {
    if (!deletingTemplate) return;
    try {
      await deleteTemplate.mutateAsync(deletingTemplate.id);
      notifications.show({
        color: "green",
        title: "Đã xóa ca tuần",
        message: `Đã xóa mẫu “${deletingTemplate.name}”.`,
      });
      setDeletingTemplate(null);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không xóa được ca tuần",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Mẫu đã từng áp dụng được giữ lại để bảo toàn lịch sử phân ca.",
      });
    }
  }

  const columns: DataTableColumn<WeeklyShiftTemplate>[] = [
    {
      key: "number",
      header: "TT",
      width: 52,
      align: "center",
      render: (template) => templates.findIndex((item) => item.id === template.id) + 1,
    },
    {
      key: "name",
      header: "Lịch tuần",
      minWidth: 230,
      render: (template) => (
        <Stack gap={2}>
          <Text fw={600}>{template.name}</Text>
          {template.note ? (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {template.note}
            </Text>
          ) : null}
        </Stack>
      ),
    },
    ...WEEKDAY_EDITOR_ORDER.map<DataTableColumn<WeeklyShiftTemplate>>(
      (weekday) => ({
        key: `weekday-${weekday}`,
        header: WEEKDAY_LABELS[weekday],
        width: 84,
        align: "center",
        render: (template) => {
          const day = templateDay(template, weekday);
          return day?.shift ? (
            <Text size="sm" fw={600} c="violet.8" title={templateDayDescription(template, weekday)}>
              {day.shift.code}
            </Text>
          ) : (
            <Badge size="xs" color="gray" variant="light" title="Nghỉ theo ca tuần">
              Nghỉ
            </Badge>
          );
        },
      }),
    ),
    {
      key: "status",
      header: "Trạng thái",
      width: 105,
      align: "center",
      render: (template) => (
        <Badge size="sm" color={statusColor(template.status)} variant="light">
          {template.status === "ACTIVE" ? "ĐANG DÙNG" : "TẠM NGƯNG"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      width: 188,
      align: "right",
      render: (template) => (
        <Group gap={2} justify="flex-end" wrap="nowrap">
          <Button
            size="compact-xs"
            variant="subtle"
            disabled={!canEdit}
            onClick={(event) => {
              event.stopPropagation();
              openApply(template);
            }}
          >
            Áp dụng
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            leftSection={<IconEdit size={14} />}
            disabled={!canEdit}
            onClick={(event) => {
              event.stopPropagation();
              openEdit(template);
            }}
          >
            Sửa
          </Button>
          <Button
            aria-label={`Xóa ca tuần ${template.name}`}
            size="compact-xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={14} />}
            disabled={!canEdit}
            onClick={(event) => {
              event.stopPropagation();
              setDeletingTemplate(template);
            }}
          >
            Xóa
          </Button>
        </Group>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Mẫu lịch tuần"
        subtitle="Tạo mẫu lịch lặp từ Thứ 2 đến Chủ nhật, rồi áp dụng cho một hoặc nhiều CBNV trong đúng Kỳ công và đơn vị đã chọn."
        actions={
          canEdit ? (
            <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
              Tạo ca tuần
            </Button>
          ) : null
        }
      />

      <Stack gap="md">
        <Alert
          icon={<IconInfoCircle size={18} />}
          color="blue"
          variant="light"
          title="Ca tuần là mẫu dùng chung, áp riêng cho từng CBNV"
        >
          Mỗi ô T2–CN chọn một <b>Ca làm việc</b> có sẵn hoặc <b>Nghỉ</b>.
          “Nghỉ” chặn kế thừa ca phòng ban, đơn vị và lịch chung cho ngày đó.
          Khi áp dụng, hệ thống lưu snapshot; sửa mẫu chỉ ảnh hưởng lần áp dụng
          sau, không tự sửa BCC hoặc lịch đã áp dụng trước đó.
        </Alert>

        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Title order={3} size="h5">
              Danh sách ca tuần
            </Title>
            <Text size="sm" c="dimmed">
              {templates.length} mẫu
            </Text>
          </Group>
          <DataTable
            data={templates}
            columns={columns}
            rowKey={(template) => template.id}
            loading={templatesQuery.isLoading}
            error={templatesQuery.error}
            onRetry={() => void templatesQuery.refetch()}
            onRowClick={(template) => setSelectedTemplateId(template.id)}
            emptyTitle="Chưa có ca tuần"
            emptyDescription="Tạo mẫu tuần trước, sau đó áp dụng cho CBNV từ màn này hoặc từ Phân ca."
          />
        </Stack>

        <Paper withBorder p="md" radius="md">
          {selectedTemplate ? (
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Stack gap={2}>
                  <Group gap="xs">
                    <Title order={3} size="h5">
                      {selectedTemplate.name}
                    </Title>
                    <Badge color={statusColor(selectedTemplate.status)} variant="light">
                      {selectedTemplate.status === "ACTIVE" ? "ĐANG DÙNG" : "TẠM NGƯNG"}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {selectedTemplate.note || "Chưa có ghi chú."}
                  </Text>
                </Stack>
                <Group gap="xs">
                  {canEdit ? (
                    <Button variant="default" size="sm" onClick={() => openEdit(selectedTemplate)}>
                      Sửa mẫu
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    leftSection={<IconUsers size={16} />}
                    disabled={!canEdit}
                    onClick={() => openApply(selectedTemplate)}
                  >
                    Áp dụng cho CBNV
                  </Button>
                </Group>
              </Group>
              <Table withTableBorder withColumnBorders horizontalSpacing="sm" verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    {WEEKDAY_EDITOR_ORDER.map((weekday) => (
                      <Table.Th key={weekday} ta="center">
                        {WEEKDAY_LABELS[weekday]}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    {WEEKDAY_EDITOR_ORDER.map((weekday) => {
                      const day = templateDay(selectedTemplate, weekday);
                      return (
                        <Table.Td key={weekday} ta="center" title={templateDayDescription(selectedTemplate, weekday)}>
                          {day?.shift ? (
                            <Stack gap={0} align="center">
                              <Text fw={700} c="violet.8">
                                {day.shift.code}
                              </Text>
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {day.shift.name}
                              </Text>
                            </Stack>
                          ) : (
                            <Badge color="gray" variant="light">
                              Nghỉ
                            </Badge>
                          )}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Chọn một ca tuần để xem lịch T2–CN và áp dụng cho CBNV.
            </Text>
          )}
        </Paper>
        {selectedTemplate ? (
          <Paper withBorder p="md" radius="md">
            <WeeklyShiftAssignmentsPanel
              template={selectedTemplate}
              canEdit={canEdit}
            />
          </Paper>
        ) : null}
      </Stack>

      <Drawer
        opened={editorOpened}
        onClose={closeEditor}
        title={editingTemplate ? `Sửa ca tuần: ${editingTemplate.name}` : "Tạo ca tuần"}
        position="right"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Lịch tuần"
            placeholder="Ví dụ: Hành chính T2–T6, sáng Thứ 7"
            withAsterisk
            value={editorName}
            disabled={!canEdit || createTemplate.isPending || updateTemplate.isPending}
            onChange={(event) => setEditorName(event.currentTarget.value)}
          />
          <Textarea
            label="Ghi chú"
            placeholder="Nhóm nhân sự hoặc nguyên tắc áp dụng"
            autosize
            minRows={2}
            value={editorNote}
            disabled={!canEdit || createTemplate.isPending || updateTemplate.isPending}
            onChange={(event) => setEditorNote(event.currentTarget.value)}
          />
          <Alert color="gray" variant="light" title="Nghỉ là trạng thái rõ ràng">
            Chọn “Nghỉ” khi ngày đó không làm việc. Ngày Nghỉ không tự lấy ca
            của phòng ban, đơn vị hay lịch tuần mặc định.
          </Alert>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {WEEKDAY_EDITOR_ORDER.map((weekday) => (
              <Select
                key={weekday}
                label={WEEKDAY_LABELS[weekday]}
                data={shiftOptions}
                value={editorDays[weekday] ?? OFF_VALUE}
                searchable
                allowDeselect={false}
                disabled={!canEdit || createTemplate.isPending || updateTemplate.isPending}
                nothingFoundMessage="Chưa có ca đang áp dụng"
                onChange={(value) => setEditorDay(weekday, value)}
              />
            ))}
          </SimpleGrid>
          {!activeShifts.length && !shiftsQuery.isLoading ? (
            <Alert color="yellow" variant="light">
              Chưa có ca làm việc trong ngày đang áp dụng. Tạo ca ở “Ca làm việc” trước khi lập Ca tuần.
            </Alert>
          ) : null}
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={closeEditor}>
              Hủy
            </Button>
            <Button
              loading={createTemplate.isPending || updateTemplate.isPending}
              disabled={!canEdit}
              onClick={() => void saveTemplate()}
            >
              Lưu ca tuần
            </Button>
          </Group>
        </Stack>
      </Drawer>

      <Drawer
        opened={Boolean(applyTemplate)}
        onClose={closeApply}
        title={applyTemplate ? `Áp dụng ca tuần: ${applyTemplate.name}` : "Áp dụng ca tuần"}
        position="right"
        size="lg"
      >
        <Stack gap="md">
          {applyTemplate ? (
            <Alert color="violet" variant="light" title="Lịch mẫu được chụp lại khi áp dụng">
              {WEEKDAY_EDITOR_ORDER.map((weekday) => `${WEEKDAY_LABELS[weekday]}: ${templateDayLabel(applyTemplate, weekday)}`).join(" · ")}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <Select
              label="Kỳ công"
              data={monthOptions}
              value={String(applyMonth)}
              allowDeselect={false}
              disabled={applyTemplateMutation.isPending}
              onChange={(value) => updateApplyPeriod(Number(value ?? applyMonth), applyYear)}
            />
            <Select
              label="Năm"
              data={yearOptions}
              value={String(applyYear)}
              allowDeselect={false}
              disabled={applyTemplateMutation.isPending}
              onChange={(value) => updateApplyPeriod(applyMonth, Number(value ?? applyYear))}
            />
            <Select
              label="Đơn vị"
              placeholder="Chọn đơn vị"
              data={unitOptions}
              value={resolvedApplyUnitId}
              searchable
              disabled={unitsQuery.isLoading || applyTemplateMutation.isPending}
              onChange={(value) => {
                setApplyUnitId(value);
                setApplyEmployeeIds([]);
              }}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <HrmDateInput
              label="Từ ngày"
              clearable={false}
              minDate={periodStart}
              maxDate={periodEnd}
              value={effectiveFrom}
              disabled={applyTemplateMutation.isPending}
              onChange={(value) => setEffectiveFrom(value ?? periodStart)}
            />
            <HrmDateInput
              label="Đến ngày"
              clearable={false}
              minDate={effectiveFrom || periodStart}
              maxDate={periodEnd}
              value={effectiveTo}
              disabled={applyTemplateMutation.isPending}
              onChange={(value) => setEffectiveTo(value ?? periodEnd)}
            />
          </SimpleGrid>
          <MultiSelect
            label="Nhân sự"
            description={`Đã chọn ${applyEmployeeIds.length} CBNV trong đơn vị.`}
            placeholder={resolvedApplyUnitId ? "Tìm và chọn CBNV" : "Chọn đơn vị trước"}
            data={employeeOptions}
            value={applyEmployeeIds}
            searchable
            clearable
            disabled={!resolvedApplyUnitId || employeesQuery.isLoading || applyTemplateMutation.isPending}
            nothingFoundMessage="Không có CBNV phù hợp"
            onChange={setApplyEmployeeIds}
          />
          <Checkbox
            label="Đưa vào BCC cùng ca"
            checked={includeInTimesheet}
            disabled={applyTemplateMutation.isPending}
            onChange={(event) => setIncludeInTimesheet(event.currentTarget.checked)}
          />
          <Textarea
            label="Ghi chú áp dụng"
            placeholder="Ví dụ: Áp dụng cho tổ trực tháng này"
            autosize
            minRows={2}
            value={applyNote}
            disabled={applyTemplateMutation.isPending}
            onChange={(event) => setApplyNote(event.currentTarget.value)}
          />
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            Chỉ áp dụng trong Kỳ công đã chọn. Ca tuần mới thay phần ca cũ chồng khoảng; ngày nằm ngoài phạm vi vẫn được giữ nguyên.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeApply}>
              Hủy
            </Button>
            <Button
              leftSection={<IconCalendarTime size={16} />}
              loading={applyTemplateMutation.isPending}
              disabled={!canEdit || !resolvedApplyUnitId || !applyEmployeeIds.length}
              onClick={() => void applyWeeklyTemplate()}
            >
              Áp dụng ca tuần
            </Button>
          </Group>
        </Stack>
      </Drawer>

      <Modal
        opened={Boolean(deletingTemplate)}
        onClose={() => setDeletingTemplate(null)}
        title="Xóa ca tuần"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Xóa mẫu <b>{deletingTemplate?.name}</b>? Mẫu đã từng áp dụng sẽ được hệ thống giữ lại để bảo toàn lịch sử.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeletingTemplate(null)}>
              Hủy
            </Button>
            <Button
              color="red"
              loading={deleteTemplate.isPending}
              onClick={() => void removeTemplate()}
            >
              Xóa ca tuần
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
