import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
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
  return new Date().toISOString().split("T")[0];
}

export function ShiftAssignmentsPage() {
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ending, setEnding] = useState<ShiftAssignment | null>(null);

  const assignmentsQuery = useShiftAssignments();
  const shiftsQuery = useWorkShifts();
  const unitsQuery = useUnitsSelect();
  const createAssignment = useCreateShiftAssignment();
  const endAssignment = useEndShiftAssignment();

  const form = useForm<AssignmentFormValues>({
    initialValues: {
      targetKind: "department",
      shiftId: "",
      employeeId: "",
      departmentId: "",
      unitId: "",
      effectiveFrom: todayIso(),
      effectiveTo: "",
      note: "",
    },
    validate: {
      shiftId: (value) => (value ? null : "Chọn ca làm việc."),
      effectiveFrom: (value) =>
        DATE_PATTERN.test(value) ? null : "Ngày phải theo dạng YYYY-MM-DD.",
      effectiveTo: (value) =>
        !value || DATE_PATTERN.test(value)
          ? null
          : "Ngày phải theo dạng YYYY-MM-DD.",
      employeeId: (value, values) =>
        values.targetKind === "employee" && !value ? "Chọn nhân viên." : null,
      departmentId: (value, values) =>
        values.targetKind === "department" && !value ? "Chọn phòng ban." : null,
      unitId: (value, values) =>
        values.targetKind === "unit" && !value ? "Chọn đơn vị." : null,
    },
  });

  const targetKind = form.values.targetKind;
  const departmentsQuery = useDepartmentsSelect(form.values.unitId || undefined);
  // Chỉ tải danh sách nhân viên khi thực sự cần — tránh kéo cả công ty về
  // mỗi lần mở trang.
  const employeesQuery = useAllEmployees({});

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

  const activeAssignments = useMemo(
    () => (assignmentsQuery.data ?? []).filter((assignment) => assignment.status === "ACTIVE"),
    [assignmentsQuery.data],
  );
  const groupedAssignments = useMemo(
    () => [
      {
        key: "employee",
        title: "1. Cá nhân",
        color: "grape",
        priority: "Ưu tiên cao nhất",
        items: activeAssignments.filter((assignment) => assignment.employee),
      },
      {
        key: "department",
        title: "2. Phòng ban",
        color: "hacomRed",
        priority: "Sau cá nhân",
        items: activeAssignments.filter((assignment) => assignment.department),
      },
      {
        key: "unit",
        title: "3. Đơn vị",
        color: "teal",
        priority: "Sau phòng ban",
        items: activeAssignments.filter((assignment) => assignment.unit),
      },
    ],
    [activeAssignments],
  );
  const unclearEmployees = useMemo(() => {
    return (employeesQuery.data ?? []).filter((employee) => {
      const assignment = employee.currentEmployeeAssignment;
      return !activeAssignments.some((item) =>
        item.employeeId === employee.id ||
        (item.departmentId && item.departmentId === assignment?.departmentId) ||
        (item.unitId && item.unitId === assignment?.unitId),
      );
    });
  }, [activeAssignments, employeesQuery.data]);

  async function handleSubmit(values: AssignmentFormValues) {
    try {
      await createAssignment.mutateAsync({
        shiftId: values.shiftId,
        employeeId: values.targetKind === "employee" ? values.employeeId : undefined,
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
        message: "Bộ tính công sẽ áp ca mới cho các ngày trong khoảng hiệu lực.",
      });
      setDrawerOpen(false);
      form.reset();
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
        message: "Đối tượng này quay về lịch tuần mặc định.",
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
                <Badge size="sm" variant="light" color="hacomRed">
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
          `${record.effectiveFrom.split("T")[0]} → ${
            record.effectiveTo ? record.effectiveTo.split("T")[0] : "không thời hạn"
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
        subtitle="Gán ca riêng cho cá nhân, phòng ban hoặc đơn vị. Ai không có phân ca riêng sẽ dùng lịch tuần mặc định."
        actions={
          canEdit ? (
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => {
                form.reset();
                setDrawerOpen(true);
              }}
            >
              Phân ca
            </Button>
          ) : null
        }
      />

      <Stack gap="md">
        <Alert
          icon={<IconInfoCircle size={18} />}
          color={unclearEmployees.length > 0 ? "yellow" : "hacomRed"}
          variant="light"
          title={unclearEmployees.length > 0 ? `${unclearEmployees.length} nhân sự chưa có phân ca riêng` : "Độ ưu tiên khi một người trúng nhiều phân ca"}
        >
          Cá nhân <b>&gt;</b> phòng ban <b>&gt;</b> đơn vị <b>&gt;</b> lịch tuần
          mặc định. Ngày lễ luôn phủ lên tất cả. Nhóm chưa xác định được ca
          (bảo vệ, lái xe…) nên <b>để trống</b> — hệ thống sẽ dùng lịch tuần
          mặc định thay vì chấm sai âm thầm.
        </Alert>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {groupedAssignments.map((group) => (
            <Card key={group.key} withBorder className="shift-assignment-group-card">
              <Group justify="space-between" mb="sm">
                <Badge color={group.color} variant="light">{group.title}</Badge>
                <Text size="xs" c="dimmed">{group.priority}</Text>
              </Group>
              <Stack gap="xs">
                {group.items.slice(0, 5).map((assignment) => (
                  <Group key={assignment.id} justify="space-between" wrap="nowrap" className="shift-assignment-item">
                    <Text size="sm" fw={650} lineClamp={1}>
                      {assignment.employee
                        ? `${assignment.employee.employeeCode} - ${assignment.employee.fullName}`
                        : assignment.department?.name ?? assignment.unit?.name ?? "-"}
                    </Text>
                    <Badge size="xs" variant="light">{assignment.shift.code}</Badge>
                  </Group>
                ))}
                {!group.items.length ? (
                  <Text size="sm" c="dimmed">Chưa có phân ca cấp này.</Text>
                ) : null}
                {group.items.length > 5 ? (
                  <Text size="xs" c="dimmed">Còn {group.items.length - 5} phân ca khác.</Text>
                ) : null}
              </Stack>
            </Card>
          ))}
        </SimpleGrid>

        <DataTable
          data={assignmentsQuery.data ?? []}
          columns={columns}
          rowKey={(record) => record.id}
          loading={assignmentsQuery.isLoading}
          error={assignmentsQuery.error}
          onRetry={() => void assignmentsQuery.refetch()}
          emptyTitle="Chưa có phân ca riêng"
          emptyDescription="Toàn công ty đang dùng lịch tuần mặc định. Chỉ phân ca cho nhóm có giờ giấc khác."
        />
      </Stack>

      <Drawer
        opened={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          form.reset();
        }}
        title="Phân ca"
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => void handleSubmit(values))}>
          <Stack gap="sm">
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
              <TextInput
                label="Hiệu lực từ"
                placeholder="2026-08-10"
                withAsterisk
                {...form.getInputProps("effectiveFrom")}
              />
              <TextInput
                label="Hiệu lực đến"
                placeholder="Bỏ trống = không thời hạn"
                {...form.getInputProps("effectiveTo")}
              />
            </Group>

            <Textarea label="Ghi chú" minRows={2} {...form.getInputProps("note")} />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setDrawerOpen(false)}>
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
            Kết thúc phân ca này? Đối tượng sẽ quay về{" "}
            <b>lịch tuần mặc định</b> kể từ lúc kết thúc.
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
