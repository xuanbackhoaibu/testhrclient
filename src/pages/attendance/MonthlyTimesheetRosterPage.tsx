import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCalendarTime,
  IconExternalLink,
  IconSearch,
  IconUserCheck,
} from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  useInitializeMonthlyTimesheetRoster,
  useMonthlyTimesheetRoster,
  useUpdateMonthlyTimesheetRosterMembers,
} from "../../features/attendance/useTimesheet";
import { showAttendanceError } from "../../features/attendance/attendanceErrorNotification";
import type {
  MonthlyTimesheetRosterQuery,
  MonthlyTimesheetRosterRow,
} from "../../features/attendance/timesheetTypes";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import type { PaginationMeta } from "../../shared/types/api";
import { HrmDateInput } from "../../shared/components/HrmDateInput";
import { PageHeader } from "../../shared/components/PageHeader";
import { InfoBanner } from "../../shared/components/InfoBanner";
import { FilterBar } from "../../shared/components/FilterBar";
import filterStyles from "../../shared/components/FilterBar.module.css";
import { useImeSafeSearch } from "../../shared/hooks/useImeSafeSearch";
import { ROUTES } from "../../shared/constants/routes";
import { formatDate } from "../../shared/utils/date";

type RosterDraft = {
  includedInTimesheet: boolean;
  attendanceFrom: string;
  attendanceTo: string;
};

const today = new Date();
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Tháng ${index + 1}`,
}));
const yearOptions = Array.from({ length: 7 }, (_, index) => {
  const year = today.getFullYear() - 2 + index;
  return { value: String(year), label: String(year) };
});
const EMPTY_ROWS: MonthlyTimesheetRosterRow[] = [];

function createDraft(row: MonthlyTimesheetRosterRow): RosterDraft {
  return {
    includedInTimesheet: row.includedInTimesheet,
    attendanceFrom: row.attendanceFrom ?? "",
    attendanceTo: row.attendanceTo ?? "",
  };
}

function isDraftChanged(row: MonthlyTimesheetRosterRow, draft: RosterDraft) {
  const current = createDraft(row);
  return (
    draft.includedInTimesheet !== current.includedInTimesheet ||
    draft.attendanceFrom !== current.attendanceFrom ||
    draft.attendanceTo !== current.attendanceTo
  );
}

function lifecycleBadge(row: MonthlyTimesheetRosterRow) {
  if (row.lifecycle === "NEW_HIRE") {
    return { color: "blue", label: "Mới trong tháng" };
  }
  if (row.lifecycle === "TERMINATED_IN_MONTH") {
    return { color: "orange", label: "Nghỉ trong tháng" };
  }
  if (row.lifecycle === "NOT_ELIGIBLE") {
    return { color: "red", label: "Chưa đủ điều kiện" };
  }
  return { color: "green", label: "Đang làm việc" };
}

function monthEndIso(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(
    new Date(year, month, 0).getDate(),
  ).padStart(2, "0")}`;
}

function initialMonth(value: string | null): number {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? month
    : today.getMonth() + 1;
}

function initialYear(value: string | null): number {
  const year = Number(value);
  const currentYear = today.getFullYear();
  return Number.isInteger(year) &&
    year >= currentYear - 2 &&
    year <= currentYear + 4
    ? year
    : currentYear;
}

export function MonthlyTimesheetRosterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);
  const [month, setMonth] = useState(() =>
    initialMonth(searchParams.get("month")),
  );
  const [year, setYear] = useState(() => initialYear(searchParams.get("year")));
  const [requestedUnitId, setRequestedUnitId] = useState<string | null>(
    () => searchParams.get("unitId")?.trim() || null,
  );
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [draftState, setDraftState] = useState<{
    key: string;
    values: Record<string, RosterDraft>;
  }>({ key: "", values: {} });

  const unitsQuery = useUnitsSelect();
  const initializeRoster = useInitializeMonthlyTimesheetRoster();
  const updateMembers = useUpdateMonthlyTimesheetRosterMembers();

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
    unitOptions.some((unit) => unit.value === requestedUnitId)
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
    onSearch: (value) => {
      setSearch(value.trim());
      setPagination((current) => ({ ...current, page: 1 }));
    },
  });
  const query = useMemo<MonthlyTimesheetRosterQuery | null>(
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
  const rosterQuery = useMonthlyTimesheetRoster(query);
  const rosterResult = rosterQuery.data;
  const rows = rosterResult?.rows ?? EMPTY_ROWS;
  const roster = rosterResult?.roster ?? null;
  const hasRoster = Boolean(roster);
  const maxAttendanceDate = monthEndIso(year, month);

  const rosterDraftKey = [
    year,
    month,
    selectedUnitId ?? "",
    roster?.updatedAt ?? "preview",
  ].join("|");
  const draftOverrides = useMemo(
    () =>
      draftState.key === rosterDraftKey
        ? draftState.values
        : ({} as Record<string, RosterDraft>),
    [draftState, rosterDraftKey],
  );
  const drafts = useMemo<Record<string, RosterDraft>>(
    () =>
      Object.fromEntries(
        rows.map((row) => [
          row.employeeId,
          draftOverrides[row.employeeId] ?? createDraft(row),
        ]),
      ),
    [draftOverrides, rows],
  );

  const selectedCount = rows.filter(
    (row) => drafts[row.employeeId].includedInTimesheet,
  ).length;
  const selectedUnassignedDays = rows.reduce(
    (total, row) =>
      drafts[row.employeeId].includedInTimesheet
        ? total + row.unassignedWorkingDays
        : total,
    0,
  );
  const hasChanges = Object.keys(draftOverrides).length > 0;

  // Phân trang ở client: giữ bộ lọc và thanh thao tác luôn nằm trong tầm nhìn
  // thay vì phải cuộn qua toàn bộ danh sách CBNV của đơn vị.
  const totalPages = Math.max(1, Math.ceil(rows.length / pagination.pageSize));
  const currentPage = Math.min(pagination.page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pagination.pageSize;
    return rows.slice(start, start + pagination.pageSize);
  }, [currentPage, pagination.pageSize, rows]);
  const pagedMeta = useMemo<PaginationMeta>(
    () => ({
      page: currentPage,
      pageSize: pagination.pageSize,
      total: rows.length,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    }),
    [currentPage, pagination.pageSize, rows.length, totalPages],
  );

  const updateDraft = useCallback(
    (employeeId: string, patch: Partial<RosterDraft>) => {
      const row = rows.find((item) => item.employeeId === employeeId);
      if (!row) return;
      setDraftState((current) => {
        const values =
          current.key === rosterDraftKey
            ? current.values
            : ({} as Record<string, RosterDraft>);
        const nextDraft = {
          ...(values[employeeId] ?? createDraft(row)),
          ...patch,
        };
        const nextValues = { ...values };
        if (isDraftChanged(row, nextDraft)) {
          nextValues[employeeId] = nextDraft;
        } else {
          delete nextValues[employeeId];
        }
        return { key: rosterDraftKey, values: nextValues };
      });
    },
    [rosterDraftKey, rows],
  );

  const setAllEligible = useCallback(
    (includedInTimesheet: boolean) => {
      setDraftState((current) => {
        const values =
          current.key === rosterDraftKey
            ? { ...current.values }
            : ({} as Record<string, RosterDraft>);
        rows.forEach((row) => {
          if (!row.canInclude) return;
          const nextDraft = {
            ...(values[row.employeeId] ?? createDraft(row)),
            includedInTimesheet,
          };
          if (isDraftChanged(row, nextDraft)) {
            values[row.employeeId] = nextDraft;
          } else {
            delete values[row.employeeId];
          }
        });
        return { key: rosterDraftKey, values };
      });
    },
    [rosterDraftKey, rows],
  );

  async function handleInitialize() {
    if (!selectedUnitId) return;
    try {
      await initializeRoster.mutateAsync({
        month,
        year,
        unitId: selectedUnitId,
      });
      notifications.show({
        color: "green",
        title: "Đã khởi tạo bảng sắp ca",
        message: "Chọn các CBNV đủ điều kiện rồi lưu để đưa vào BCC.",
      });
    } catch (error) {
      showAttendanceError(
        error,
        "Không khởi tạo được bảng sắp ca",
        "Kiểm tra đơn vị rồi thử lại.",
      );
    }
  }

  async function handleSave() {
    if (!roster) return;
    const members = Object.entries(draftOverrides).map(
      ([employeeId, draft]) => ({
        employeeId,
        includedInTimesheet: draft.includedInTimesheet,
        attendanceFrom: draft.attendanceFrom || undefined,
        attendanceTo: draft.attendanceTo || undefined,
      }),
    );
    if (!members.length) {
      notifications.show({
        color: "blue",
        title: "Chưa có thay đổi",
        message: "Danh sách đưa vào BCC hiện đã được lưu.",
      });
      return;
    }

    try {
      await updateMembers.mutateAsync({ id: roster.id, payload: { members } });
      notifications.show({
        color: "green",
        title: "Đã lưu danh sách BCC",
        message: "Bảng công tháng sẽ dùng các CBNV đã chọn trong đơn vị này.",
      });
    } catch (error) {
      showAttendanceError(
        error,
        "Không lưu được danh sách BCC",
        "Kiểm tra ngày tính công rồi thử lại.",
      );
    }
  }

  function openTimesheet() {
    if (!selectedUnitId) {
      navigate(ROUTES.timesheetGrid);
      return;
    }
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
      unitId: selectedUnitId,
    });
    navigate(`${ROUTES.timesheetGrid}?${params.toString()}`);
  }

  const columns = useMemo<DataTableColumn<MonthlyTimesheetRosterRow>[]>(
    () => [
      {
        key: "included",
        header: "Vào BCC",
        width: 92,
        align: "center",
        render: (row) => {
          const draft = drafts[row.employeeId] ?? createDraft(row);
          return (
            <Stack align="center" gap={2}>
              <Checkbox
                checked={draft.includedInTimesheet}
                disabled={!canEdit || !hasRoster || !row.canInclude}
                aria-label={`Đưa ${row.fullName} vào BCC`}
                onChange={(event) =>
                  updateDraft(row.employeeId, {
                    includedInTimesheet: event.currentTarget.checked,
                  })
                }
              />
              {!row.canInclude ? (
                <Text size="xs" c="red" ta="center" maw={112}>
                  {row.eligibilityReason ?? "Không đủ điều kiện"}
                </Text>
              ) : null}
            </Stack>
          );
        },
      },
      {
        key: "employee",
        header: "Họ và tên",
        minWidth: 210,
        render: (row) => (
          <Stack gap={2}>
            <Text fw={600}>{row.fullName}</Text>
            <Text size="xs" c="dimmed">
              {row.jobTitle ?? "Chưa có chức vụ"}
            </Text>
          </Stack>
        ),
      },
      {
        key: "attendanceCode",
        header: "MCB",
        width: 105,
        render: (row) => <Text fw={500}>{row.attendanceCode ?? "—"}</Text>,
      },
      {
        key: "department",
        header: "Phòng ban",
        minWidth: 165,
        render: (row) => row.departmentName ?? "—",
      },
      {
        key: "lifecycle",
        header: "Tình trạng",
        minWidth: 165,
        render: (row) => {
          const status = lifecycleBadge(row);
          return (
            <Stack gap={3}>
              <Badge color={status.color} variant="light" w="fit-content">
                {status.label}
              </Badge>
              {row.lifecycle === "NEW_HIRE" ? (
                <Text size="xs" c="dimmed">
                  Vào làm: {formatDate(row.hireDate)}
                </Text>
              ) : null}
              {row.lifecycle === "TERMINATED_IN_MONTH" ? (
                <Text size="xs" c="dimmed">
                  Nghỉ từ: {formatDate(row.terminationEffectiveDate)}
                </Text>
              ) : null}
              {row.lifecycle === "NOT_ELIGIBLE" && row.eligibilityReason ? (
                <Text size="xs" c="red">
                  {row.eligibilityReason}
                </Text>
              ) : null}
            </Stack>
          );
        },
      },
      {
        key: "attendanceFrom",
        header: "Từ tính công",
        // Fits dd/mm/yyyy plus the clear and calendar buttons.
        minWidth: 172,
        render: (row) => {
          const draft = drafts[row.employeeId] ?? createDraft(row);
          return (
            <HrmDateInput
              aria-label={`Ngày bắt đầu tính công của ${row.fullName}`}
              size="sm"
              value={draft.attendanceFrom || null}
              minDate={row.attendanceFrom ?? undefined}
              maxDate={row.attendanceTo ?? maxAttendanceDate}
              disabled={!canEdit || !hasRoster || !row.canInclude}
              onChange={(value) =>
                updateDraft(row.employeeId, { attendanceFrom: value ?? "" })
              }
            />
          );
        },
      },
      {
        key: "attendanceTo",
        header: "Đến ngày",
        minWidth: 172,
        render: (row) => {
          const draft = drafts[row.employeeId] ?? createDraft(row);
          return (
            <HrmDateInput
              aria-label={`Ngày kết thúc tính công của ${row.fullName}`}
              size="sm"
              placeholder="Hết kỳ"
              value={draft.attendanceTo || null}
              minDate={draft.attendanceFrom || row.attendanceFrom || undefined}
              maxDate={row.attendanceTo ?? maxAttendanceDate}
              disabled={!canEdit || !hasRoster || !row.canInclude}
              onChange={(value) =>
                updateDraft(row.employeeId, { attendanceTo: value ?? "" })
              }
            />
          );
        },
      },
      {
        key: "schedule",
        header: "Kiểm tra ca",
        minWidth: 165,
        render: (row) =>
          row.unassignedWorkingDays > 0 ? (
            <Group gap={5} wrap="nowrap">
              <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
              <Text size="sm" c="red">
                Chưa phân ca {row.unassignedWorkingDays} ngày
              </Text>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              Không có cảnh báo
            </Text>
          ),
      },
    ],
    [canEdit, drafts, hasRoster, maxAttendanceDate, updateDraft],
  );

  return (
    <>
      <PageHeader
        title="Sắp ca tháng"
        subtitle="Chọn CBNV theo đơn vị trước khi mở bảng công. Ca làm việc vẫn được cấu hình riêng ở bước Phân ca."
        actions={
          <Group gap="xs">
            {canEdit ? (
              <Button
                variant="default"
                leftSection={<IconCalendarTime size={17} />}
                onClick={() => navigate(ROUTES.shiftAssignments)}
              >
                Phân ca
              </Button>
            ) : null}
            <Button
              variant="light"
              leftSection={<IconExternalLink size={17} />}
              disabled={!selectedUnitId}
              onClick={openTimesheet}
            >
              Mở BCC
            </Button>
          </Group>
        }
      />

      <Stack gap="md">
        <FilterBar>
          <Select
            aria-label="Kỳ công"
            data={monthOptions}
            value={String(month)}
            allowDeselect={false}
            onChange={(value) => {
              setMonth(Number(value ?? month));
              setPagination((current) => ({ ...current, page: 1 }));
            }}
            size="sm"
            className={filterStyles.field}
          />
          <Select
            aria-label="Năm"
            data={yearOptions}
            value={String(year)}
            allowDeselect={false}
            onChange={(value) => {
              setYear(Number(value ?? year));
              setPagination((current) => ({ ...current, page: 1 }));
            }}
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
              setPagination((current) => ({ ...current, page: 1 }));
            }}
            size="sm"
            className={filterStyles.fieldWide}
          />
          <Select
            aria-label="Phòng ban"
            placeholder="Tất cả phòng ban"
            data={departmentOptions}
            value={departmentId}
            clearable
            searchable
            disabled={!selectedUnitId || departmentsQuery.isLoading}
            onChange={(value) => {
              setDepartmentId(value);
              setPagination((current) => ({ ...current, page: 1 }));
            }}
            size="sm"
            className={filterStyles.fieldWide}
          />
          <TextInput
            aria-label="Tìm nhân sự"
            placeholder="Tên, MCB hoặc mã nhân sự"
            leftSection={<IconSearch size={15} />}
            {...searchInput.inputProps}
            size="sm"
            className={filterStyles.grow}
          />
        </FilterBar>

        {unitsQuery.isError || departmentsQuery.isError ? (
          <Alert color="red" variant="light" title="Không tải được phạm vi nhân sự">
            <Group gap="xs" wrap="wrap">
              <Text size="sm">Không thể lấy đầy đủ đơn vị hoặc phòng ban để lập danh sách BCC.</Text>
              {unitsQuery.isError ? (
                <Button
                  size="compact-sm"
                  variant="light"
                  onClick={() => void unitsQuery.refetch()}
                >
                  Tải lại đơn vị
                </Button>
              ) : null}
              {departmentsQuery.isError ? (
                <Button
                  size="compact-sm"
                  variant="light"
                  onClick={() => void departmentsQuery.refetch()}
                >
                  Tải lại phòng ban
                </Button>
              ) : null}
            </Group>
          </Alert>
        ) : null}

        {!selectedUnitId ? (
          <InfoBanner>
            Chọn đơn vị để lập danh sách sắp ca tháng và đưa CBNV vào BCC.
          </InfoBanner>
        ) : null}

        {selectedUnitId && !rosterQuery.isLoading && !roster ? (
          <InfoBanner tone="warning" title="Chưa khởi tạo bảng sắp ca">
            <Stack gap="sm" align="flex-start">
              <Text size="sm" inherit>
                Danh sách dưới đây chỉ là dữ liệu xem trước. Khởi tạo để lưu
                snapshot CBNV, ngày vào làm và ngày nghỉ việc cho kỳ này.
              </Text>
              {canEdit ? (
                <Button
                  size="xs"
                  leftSection={<IconUserCheck size={15} />}
                  loading={initializeRoster.isPending}
                  onClick={() => void handleInitialize()}
                >
                  Khởi tạo bảng sắp ca
                </Button>
              ) : null}
            </Stack>
          </InfoBanner>
        ) : null}

        {selectedUnitId && roster ? (
          <Paper withBorder p="sm" radius="md">
            <Group justify="space-between" gap="sm" wrap="wrap">
              <Group gap="lg" wrap="wrap">
                <Text size="sm">
                  Đang chọn <b>{selectedCount}</b> /{" "}
                  {rosterResult?.summary.total ?? 0} CBNV
                </Text>
                <Text size="sm" c={selectedUnassignedDays ? "red" : "dimmed"}>
                  Chưa phân ca: <b>{selectedUnassignedDays}</b> ngày làm việc
                </Text>
              </Group>
              {canEdit ? (
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => setAllEligible(true)}
                  >
                    Chọn tất cả đủ điều kiện
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => setAllEligible(false)}
                  >
                    Bỏ chọn
                  </Button>
                  <Button
                    size="xs"
                    loading={updateMembers.isPending}
                    disabled={!hasChanges}
                    onClick={() => void handleSave()}
                  >
                    Lưu đưa vào BCC
                  </Button>
                </Group>
              ) : null}
            </Group>
          </Paper>
        ) : null}

        {selectedUnitId ? (
          <DataTable
            data={pagedRows}
            columns={columns}
            rowKey={(row) => row.employeeId}
            meta={pagedMeta}
            onPageChange={(page, pageSize) => setPagination({ page, pageSize })}
            loading={rosterQuery.isLoading}
            error={rosterQuery.error}
            onRetry={() => void rosterQuery.refetch()}
            emptyTitle="Không có CBNV trong phạm vi này"
            emptyDescription="Kiểm tra đơn vị, phòng ban hoặc dữ liệu phân công tổ chức của nhân sự."
          />
        ) : null}
      </Stack>
    </>
  );
}
