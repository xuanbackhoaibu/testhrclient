import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Drawer,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconPlayerStop, IconPlus } from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  useCreateShiftAssignment,
  useEndShiftAssignment,
  useShiftAssignments,
  useWorkShifts,
} from "../../features/attendance/useWorkSchedule";
import { formatVietnamBusinessDate } from "../../features/attendance/shiftAssignmentDate";
import { getActiveShiftPrefillId } from "../../features/attendance/shiftAssignmentNavigation";
import type { ShiftAssignment } from "../../features/attendance/workScheduleTypes";
import { useAllEmployees } from "../../features/employees/useEmployees";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { useUnitsSelect } from "../../features/organization/useUnits";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { TableActionsMenu } from "../../shared/components/TableActionsMenu";
import { ROUTES } from "../../shared/constants/routes";
import { formatDate } from "../../shared/utils/date";

import { HrmDateInput } from "../../shared/components/HrmDateInput";
import { MonthlyShiftAssignmentGrid } from "./MonthlyShiftAssignmentGrid";
type TargetKind = "employee" | "department" | "unit";

interface AssignmentFormValues {
  targetKind: TargetKind;
  shiftId: string;
  employeeId: string;
  departmentId: string;
  unitId: string;
  effectiveFrom: string;
  effectiveTo: string;
  note: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(): string {
  return formatVietnamBusinessDate(new Date());
}

function createAssignmentFormValues(shiftId = ""): AssignmentFormValues {
  return {
    targetKind: "department",
    shiftId,
    employeeId: "",
    departmentId: "",
    unitId: "",
    effectiveFrom: todayIso(),
    effectiveTo: "",
    note: "",
  };
}

export function ShiftAssignmentsPage() {
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedShiftId = searchParams.get("assignShiftId");
  const shouldOpenPrefilledDrawer = searchParams.get("open") === "1";

  const [drawerOpen, setDrawerOpen] = useState(
    () => canEdit && Boolean(requestedShiftId && shouldOpenPrefilledDrawer),
  );
  const [ending, setEnding] = useState<ShiftAssignment | null>(null);

  const assignmentsQuery = useShiftAssignments();
  const shiftsQuery = useWorkShifts();
  const unitsQuery = useUnitsSelect();
  const createAssignment = useCreateShiftAssignment();
  const endAssignment = useEndShiftAssignment();

  const form = useForm<AssignmentFormValues>({
    initialValues: createAssignmentFormValues(requestedShiftId ?? ""),
    validate: {
      shiftId: (value) => (value ? null : "Chọn ca làm việc."),
      effectiveFrom: (value) =>
        DATE_PATTERN.test(value) ? null : "Nhập ngày theo dạng DD/MM/YYYY.",
      effectiveTo: (value) =>
        !value || DATE_PATTERN.test(value)
          ? null
          : "Nhập ngày theo dạng DD/MM/YYYY.",
      employeeId: (value, values) =>
        values.targetKind === "employee" && !value ? "Chọn nhân viên." : null,
      departmentId: (value, values) =>
        values.targetKind === "department" && !value ? "Chọn phòng ban." : null,
      unitId: (value, values) =>
        values.targetKind === "unit" && !value ? "Chọn đơn vị." : null,
    },
  });

  function clearAssignmentIntent() {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("assignShiftId");
        next.delete("open");
        return next;
      },
      { replace: true },
    );
  }

  function resetAssignmentForm() {
    form.setValues(createAssignmentFormValues());
    form.clearErrors();
  }

  function openCreate() {
    resetAssignmentForm();
    setDrawerOpen(true);
  }

  function closeCreateDrawer() {
    setDrawerOpen(false);
    resetAssignmentForm();
    clearAssignmentIntent();
  }

  const targetKind = form.values.targetKind;
  const departmentsQuery = useDepartmentsSelect(
    form.values.unitId || undefined,
  );
  // Chỉ tải danh sách nhân viên khi thực sự cần — tránh kéo cả công ty về
  // mỗi lần mở trang.
  const employeesQuery = useAllEmployees(
    {},
    {
      enabled: targetKind === "employee",
    },
  );

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

  const hasUnavailableRequestedShift =
    Boolean(requestedShiftId) &&
    form.values.shiftId === requestedShiftId &&
    shiftsQuery.isSuccess &&
    getActiveShiftPrefillId(shiftsQuery.data, requestedShiftId) === null;
  const hasSelectedActiveShift = shiftOptions.some(
    (shift) => shift.value === form.values.shiftId,
  );

  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data ?? []).map((employee) => ({
        value: employee.id,
        label: `${employee.employeeCode} — ${employee.fullName}`,
      })),
    [employeesQuery.data],
  );

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data ?? []).map((unit) => ({
        value: unit.id,
        label: `${unit.code} — ${unit.name}`,
      })),
    [unitsQuery.data],
  );

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((department) => ({
        value: department.id,
        label: `${department.code} — ${department.name}`,
      })),
    [departmentsQuery.data],
  );

  async function handleSubmit(values: AssignmentFormValues) {
    if (!hasSelectedActiveShift) {
      notifications.show({
        color: "yellow",
        title: "Ca làm việc không còn áp dụng",
        message: "Chọn một ca đang áp dụng trước khi lưu phân ca.",
      });
      return;
    }

    try {
      await createAssignment.mutateAsync({
        shiftId: values.shiftId,
        employeeId:
          values.targetKind === "employee" ? values.employeeId : undefined,
        departmentId:
          values.targetKind === "department" ? values.departmentId : undefined,
        unitId: values.targetKind === "unit" ? values.unitId : undefined,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo || undefined,
        note: values.note.trim() || undefined,
      });
      notifications.show({
        color: "green",
        title: "Đã phân ca",
        message:
          "Mở Bảng công, chọn đúng tháng rồi Cập nhật bảng công. Ngày đã chốt hoặc HR sửa tay vẫn được giữ nguyên.",
      });
      closeCreateDrawer();
    } catch {
      notifications.show({
        color: "red",
        title: "Không phân ca được",
        message: "Kiểm tra lại ca, đích gán và khoảng ngày hiệu lực.",
      });
    }
  }

  async function handleEnd(assignment: ShiftAssignment) {
    try {
      await endAssignment.mutateAsync(assignment.id);
      notifications.show({
        color: "green",
        title: "Đã kết thúc phân ca",
        message:
          "Mở Bảng công, chọn đúng tháng rồi Cập nhật bảng công nếu cần phản ánh thay đổi; ngày đã chốt hoặc HR sửa tay vẫn được giữ nguyên.",
      });
      setEnding(null);
    } catch {
      notifications.show({
        color: "red",
        title: "Không kết thúc được phân ca",
        message: "Vui lòng thử lại sau.",
      });
    }
  }

  const columns = useMemo<DataTableColumn<ShiftAssignment>[]>(
    () => [
      {
        key: "target",
        header: "Áp dụng cho",
        render: (record) => {
          if (record.employee) {
            return (
              <Group gap={6} wrap="nowrap">
                <Badge size="sm" variant="light" color="grape">
                  Cá nhân
                </Badge>
                <Text>
                  {record.employee.employeeCode} — {record.employee.fullName}
                </Text>
              </Group>
            );
          }
          if (record.department) {
            return (
              <Group gap={6} wrap="nowrap">
                <Badge size="sm" variant="light" color="blue">
                  Phòng ban
                </Badge>
                <Text>{record.department.name}</Text>
              </Group>
            );
          }
          return (
            <Group gap={6} wrap="nowrap">
              <Badge size="sm" variant="light" color="teal">
                Đơn vị
              </Badge>
              <Text>{record.unit?.name ?? "-"}</Text>
            </Group>
          );
        },
      },
      {
        key: "shift",
        header: "Ca",
        width: 200,
        render: (record) => `${record.shift.code} — ${record.shift.name}`,
      },
      {
        key: "effective",
        header: "Hiệu lực",
        width: 220,
        render: (record) =>
          `${formatDate(record.effectiveFrom)} → ${
            record.effectiveTo
              ? formatDate(record.effectiveTo)
              : "không thời hạn"
          }`,
      },
      {
        key: "status",
        header: "Trạng thái",
        width: 130,
        render: (record) => <StatusTag status={record.status} />,
      },
      {
        key: "actions",
        header: "",
        width: 80,
        align: "right",
        render: (record) => (
          <TableActionsMenu
            actions={[
              {
                label: "Kết thúc phân ca",
                icon: <IconPlayerStop size={16} />,
                color: "red",
                disabled: !canEdit || record.status !== "ACTIVE",
                onClick: () => setEnding(record),
              },
            ]}
          />
        ),
      },
    ],
    [canEdit],
  );

  return (
    <>
      <PageHeader
        title="Phân ca"
        subtitle="Tick CBNV, chọn ca đã tạo và áp dụng theo ngày. BCC dùng đúng ca kế hoạch này sau khi được cập nhật lại."
        actions={
          canEdit ? (
            <Button
              variant="default"
              leftSection={<IconPlus size={18} />}
              onClick={openCreate}
            >
              Thêm quy tắc
            </Button>
          ) : null
        }
      />

      <Stack gap="md">
        <MonthlyShiftAssignmentGrid
          onOpenRules={openCreate}
          requestedShiftId={requestedShiftId}
        />

        <Accordion variant="contained" radius="md">
          <Accordion.Item value="assignment-rules">
            <Accordion.Control>
              Quy tắc phân ca theo phòng ban / đơn vị
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <Alert
                  icon={<IconInfoCircle size={18} />}
                  color="blue"
                  variant="light"
                  title="Độ ưu tiên khi một người trúng nhiều phân ca"
                >
                  Cá nhân <b>&gt;</b> phòng ban <b>&gt;</b> đơn vị. Lịch tuần
                  chỉ là mẫu cấu hình/preview. Ngày lễ luôn phủ lên lịch đã
                  phân. Nhóm chưa xác định được ca (bảo vệ, lái xe…) nên{" "}
                  <b>để trống</b>
                  — hệ thống đánh dấu “chưa phân ca” thay vì tự áp ca hành chính
                  rồi chấm sai âm thầm.
                  <br />
                  Một phân ca dùng cùng một mẫu ca trong toàn bộ khoảng hiệu
                  lực; không dùng một phân ca để mô phỏng lịch T2–T6 và T7 có
                  giờ khác nhau.
                </Alert>

                <DataTable
                  data={assignmentsQuery.data ?? []}
                  columns={columns}
                  rowKey={(record) => record.id}
                  loading={assignmentsQuery.isLoading}
                  error={assignmentsQuery.error}
                  onRetry={() => void assignmentsQuery.refetch()}
                  emptyTitle="Chưa có quy tắc phân ca riêng"
                  emptyDescription="Tạo quy tắc cho phòng ban hoặc đơn vị khi cần một ca mặc định theo tổ chức."
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>

      <Drawer
        opened={drawerOpen}
        onClose={closeCreateDrawer}
        title="Phân ca"
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => void handleSubmit(values))}>
          <Stack gap="sm">
            {hasUnavailableRequestedShift ? (
              <Alert
                color="yellow"
                variant="light"
                title="Ca được chọn không còn áp dụng"
              >
                Link này trỏ tới ca đã tạm ngưng hoặc không còn tồn tại. Hãy
                chọn một ca đang áp dụng trước khi lưu.
              </Alert>
            ) : null}
            {shiftsQuery.isError ? (
              <Alert
                color="red"
                variant="light"
                title="Không tải được ca làm việc"
              >
                Tải lại danh sách ca trước khi lưu phân ca.{" "}
                <Button
                  size="compact-sm"
                  variant="subtle"
                  onClick={() => void shiftsQuery.refetch()}
                >
                  Tải lại
                </Button>
              </Alert>
            ) : null}
            {shiftOptions.length === 0 && shiftsQuery.isSuccess ? (
              <Alert
                color="yellow"
                variant="light"
                title="Chưa có ca đang áp dụng"
              >
                Tạo hoặc kích hoạt ca làm việc trước khi phân ca.{" "}
                <Button
                  component={Link}
                  to={ROUTES.workShifts}
                  size="compact-sm"
                  variant="subtle"
                >
                  Quản lý ca làm việc
                </Button>
              </Alert>
            ) : null}
            <div>
              <Text size="sm" fw={500} mb={6}>
                Áp dụng cho
              </Text>
              <SegmentedControl
                fullWidth
                data={[
                  { value: "employee", label: "Cá nhân" },
                  { value: "department", label: "Phòng ban" },
                  { value: "unit", label: "Đơn vị" },
                ]}
                value={form.values.targetKind}
                onChange={(value) => {
                  form.setFieldValue("targetKind", value as TargetKind);
                  form.setFieldValue("employeeId", "");
                  form.setFieldValue("departmentId", "");
                  if (value !== "department") {
                    form.setFieldValue("unitId", "");
                  }
                }}
              />
            </div>

            {targetKind === "employee" ? (
              <Select
                label="Nhân viên"
                placeholder="Tìm theo mã hoặc tên"
                searchable
                withAsterisk
                data={employeeOptions}
                {...form.getInputProps("employeeId")}
              />
            ) : null}

            {targetKind === "department" ? (
              <>
                <Select
                  label="Lọc theo đơn vị"
                  placeholder="Tất cả đơn vị"
                  clearable
                  searchable
                  data={unitOptions}
                  {...form.getInputProps("unitId")}
                />
                <Select
                  label="Phòng ban"
                  placeholder="Chọn phòng ban"
                  searchable
                  withAsterisk
                  data={departmentOptions}
                  {...form.getInputProps("departmentId")}
                />
              </>
            ) : null}

            {targetKind === "unit" ? (
              <Select
                label="Đơn vị"
                placeholder="Chọn đơn vị"
                searchable
                withAsterisk
                data={unitOptions}
                {...form.getInputProps("unitId")}
              />
            ) : null}

            <Select
              label="Ca làm việc"
              placeholder="Chọn ca"
              withAsterisk
              data={shiftOptions}
              {...form.getInputProps("shiftId")}
            />

            <Group grow>
              <HrmDateInput
                label="Hiệu lực từ"
                placeholder="DD/MM/YYYY"
                withAsterisk
                value={form.values.effectiveFrom || null}
                onChange={(value) =>
                  form.setFieldValue("effectiveFrom", value ?? "")
                }
                error={form.errors.effectiveFrom}
              />
              <HrmDateInput
                label="Hiệu lực đến"
                placeholder="DD/MM/YYYY (bỏ trống = không thời hạn)"
                value={form.values.effectiveTo || null}
                onChange={(value) =>
                  form.setFieldValue("effectiveTo", value ?? "")
                }
                error={form.errors.effectiveTo}
              />
            </Group>

            <Textarea
              label="Ghi chú"
              minRows={2}
              {...form.getInputProps("note")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeCreateDrawer}>
                Hủy
              </Button>
              <Button
                type="submit"
                loading={createAssignment.isPending}
                disabled={!canEdit}
              >
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <Drawer
        opened={ending !== null}
        onClose={() => setEnding(null)}
        title="Kết thúc phân ca"
        position="right"
      >
        <Stack gap="sm">
          <Text size="sm">
            Kết thúc phân ca này? Các ngày sau đó sẽ ở trạng thái{" "}
            <b>chưa phân ca</b> cho đến khi HR tạo phân ca hiệu lực mới.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setEnding(null)}>
              Hủy
            </Button>
            <Button
              color="red"
              loading={endAssignment.isPending}
              onClick={() => ending && void handleEnd(ending)}
            >
              Kết thúc
            </Button>
          </Group>
        </Stack>
      </Drawer>
    </>
  );
}
