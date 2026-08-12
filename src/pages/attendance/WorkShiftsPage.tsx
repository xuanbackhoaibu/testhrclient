import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconInfoCircle, IconPlus } from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  useCreateWorkShift,
  useUpdateWorkCalendarDay,
  useUpdateWorkShift,
  useWorkCalendar,
  useWorkShifts,
} from "../../features/attendance/useWorkSchedule";
import {
  WEEKDAY_LABELS,
  type WorkShift,
} from "../../features/attendance/workScheduleTypes";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { TableActionsMenu } from "../../shared/components/TableActionsMenu";

interface ShiftFormValues {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  breakDeducted: boolean;
  standardMinutes: number;
  dayValue: number;
  lateThresholdMinutes: number;
  earlyLeaveThresholdMinutes: number;
  note: string;
  status: "ACTIVE" | "INACTIVE";
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const emptyForm: ShiftFormValues = {
  code: "",
  name: "",
  startTime: "08:00",
  endTime: "17:30",
  breakStart: "12:00",
  breakEnd: "13:00",
  breakDeducted: true,
  standardMinutes: 510,
  dayValue: 1,
  lateThresholdMinutes: 15,
  earlyLeaveThresholdMinutes: 10,
  note: "",
  status: "ACTIVE",
};

export function WorkShiftsPage() {
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<WorkShift | null>(null);

  const shiftsQuery = useWorkShifts();
  const calendarQuery = useWorkCalendar();
  const createShift = useCreateWorkShift();
  const updateShift = useUpdateWorkShift();
  const updateCalendarDay = useUpdateWorkCalendarDay();

  const form = useForm<ShiftFormValues>({
    initialValues: emptyForm,
    validate: {
      code: (value) => (value.trim() ? null : "Nhập mã ca."),
      name: (value) => (value.trim() ? null : "Nhập tên ca."),
      startTime: (value) =>
        TIME_PATTERN.test(value) ? null : "Giờ vào phải theo dạng HH:mm.",
      endTime: (value) =>
        TIME_PATTERN.test(value) ? null : "Giờ ra phải theo dạng HH:mm.",
      breakStart: (value, values) =>
        !value || TIME_PATTERN.test(value)
          ? Boolean(value) === Boolean(values.breakEnd)
            ? null
            : "Khai đủ cả giờ bắt đầu và kết thúc nghỉ trưa."
          : "Giờ nghỉ trưa phải theo dạng HH:mm.",
      standardMinutes: (value) =>
        value > 0 ? null : "Số phút công chuẩn phải lớn hơn 0.",
    },
  });

  const shiftOptions = useMemo(
    () =>
      (shiftsQuery.data ?? [])
        .filter((shift) => shift.status === "ACTIVE")
        .map((shift) => ({
          value: shift.id,
          label: `${shift.code} — ${shift.name}`,
        })),
    [shiftsQuery.data],
  );

  function openCreate() {
    setEditing(null);
    form.setValues(emptyForm);
    setDrawerOpen(true);
  }

  function openEdit(shift: WorkShift) {
    setEditing(shift);
    form.setValues({
      code: shift.code,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakStart: shift.breakStart ?? "",
      breakEnd: shift.breakEnd ?? "",
      breakDeducted: shift.breakDeducted,
      standardMinutes: shift.standardMinutes,
      dayValue: shift.dayValue,
      lateThresholdMinutes: shift.lateThresholdMinutes,
      earlyLeaveThresholdMinutes: shift.earlyLeaveThresholdMinutes,
      note: shift.note ?? "",
      status: shift.status,
    });
    setDrawerOpen(true);
  }

  async function handleSubmit(values: ShiftFormValues) {
    const payload = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      startTime: values.startTime,
      endTime: values.endTime,
      breakStart: values.breakStart || undefined,
      breakEnd: values.breakEnd || undefined,
      breakDeducted: values.breakDeducted,
      standardMinutes: values.standardMinutes,
      dayValue: values.dayValue,
      lateThresholdMinutes: values.lateThresholdMinutes,
      earlyLeaveThresholdMinutes: values.earlyLeaveThresholdMinutes,
      note: values.note.trim() || undefined,
    };

    try {
      if (editing) {
        await updateShift.mutateAsync({
          id: editing.id,
          payload: { ...payload, status: values.status },
        });
      } else {
        await createShift.mutateAsync(payload);
      }
      notifications.show({
        color: "green",
        title: editing ? "Đã cập nhật ca" : "Đã tạo ca",
        message: "Bộ tính công sẽ dùng giờ mới ngay, không cần deploy lại.",
      });
      setDrawerOpen(false);
      setEditing(null);
      form.reset();
    } catch {
      notifications.show({
        color: "red",
        title: "Không lưu được ca làm việc",
        message: "Kiểm tra lại mã ca (không trùng) và định dạng giờ HH:mm.",
      });
    }
  }

  async function handleCalendarChange(
    weekday: number,
    isWorkingDay: boolean,
    shiftId: string | null,
  ) {
    try {
      await updateCalendarDay.mutateAsync({ weekday, isWorkingDay, shiftId });
      notifications.show({
        color: "green",
        title: "Đã cập nhật lịch tuần",
        message: `${WEEKDAY_LABELS[weekday]} đã được lưu.`,
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Không cập nhật được lịch tuần",
        message: "Ngày làm việc bắt buộc phải chọn ca áp dụng.",
      });
    }
  }

  const columns = useMemo<DataTableColumn<WorkShift>[]>(
    () => [
      {
        key: "code",
        header: "Mã ca",
        width: 120,
        render: (record) => <Text fw={600}>{record.code}</Text>,
      },
      { key: "name", header: "Tên ca", render: (record) => record.name },
      {
        key: "time",
        header: "Giờ làm",
        width: 150,
        render: (record) => `${record.startTime} – ${record.endTime}`,
      },
      {
        key: "break",
        header: "Nghỉ trưa",
        width: 170,
        render: (record) =>
          record.breakStart && record.breakEnd
            ? `${record.breakStart} – ${record.breakEnd}${record.breakDeducted ? " (trừ)" : " (không trừ)"}`
            : "Không",
      },
      {
        key: "standardMinutes",
        header: "Phút chuẩn",
        width: 110,
        render: (record) => record.standardMinutes,
      },
      {
        key: "dayValue",
        header: "Số công",
        width: 130,
        render: (record) => (
          <Group gap={6} wrap="nowrap">
            <Text>{record.dayValue}</Text>
            {/* Ca ngắn hơn 1 buổi chuẩn nhưng vẫn tính đủ công là chủ ý
                (thứ 7 — quy tắc HR A3), gắn nhãn để không ai tưởng nhập nhầm. */}
            {record.standardMinutes < 480 && record.dayValue === 1 ? (
              <Badge size="xs" variant="light" color="orange">
                cả ngày
              </Badge>
            ) : null}
          </Group>
        ),
      },
      {
        key: "thresholds",
        header: "Ngưỡng muộn / sớm",
        width: 150,
        render: (record) =>
          `${record.lateThresholdMinutes}' / ${record.earlyLeaveThresholdMinutes}'`,
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
                label: "Chỉnh sửa",
                icon: <IconEdit size={16} />,
                disabled: !canEdit,
                onClick: () => openEdit(record),
              },
            ]}
          />
        ),
      },
    ],
    // openEdit chỉ đọc setState + form (ổn định), nên không cần vào deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit],
  );

  return (
    <>
      <PageHeader
        title="Ca làm việc"
        subtitle="Khai báo ca và lịch tuần. Bộ tính công đọc thẳng từ đây — sửa giờ ca là áp dụng ngay, không cần deploy lại."
        actions={
          canEdit ? (
            <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
              Tạo ca làm việc
            </Button>
          ) : null
        }
      />

      <Stack gap="lg">
        <Alert
          icon={<IconInfoCircle size={18} />}
          color="blue"
          variant="light"
          title="Quy tắc chấm công: từ 08:15 tính đi muộn"
        >
          Mốc 15 phút được tính theo điều kiện <b>từ đúng mốc</b>: vào lúc
          08:15 đã bị đánh dấu muộn. Hệ thống hiện chỉ ghi nhận, <b>chưa trừ
          công</b>. Thứ Bảy dùng ca sáng 08:00–12:00; Chủ nhật luôn là ngày
          nghỉ, không báo muộn hoặc thiếu chấm công.
        </Alert>

        <DataTable
          data={shiftsQuery.data ?? []}
          columns={columns}
          rowKey={(record) => record.id}
          loading={shiftsQuery.isLoading}
          error={shiftsQuery.error}
          onRetry={() => void shiftsQuery.refetch()}
          emptyTitle="Chưa khai báo ca làm việc"
          emptyDescription="Tạo ca hành chính trước, sau đó gán vào lịch tuần bên dưới."
        />

        <Card withBorder padding="lg" radius="md">
          <Stack gap="sm">
            <div>
              <Title order={4} size="h5">
                Lịch tuần mặc định
              </Title>
              <Text c="dimmed" size="sm">
                Áp dụng cho toàn công ty khi nhân viên không có phân ca riêng.
                Ngày lễ luôn phủ lên lịch này.
              </Text>
            </div>

            {calendarQuery.isLoading ? (
              <Text c="dimmed" size="sm">
                Đang tải lịch tuần…
              </Text>
            ) : (
              <Stack gap="xs">
                {(calendarQuery.data ?? [])
                  .slice()
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((day) => (
                    <Group key={day.weekday} gap="md" wrap="nowrap">
                      <Text w={90} fw={500}>
                        {WEEKDAY_LABELS[day.weekday]}
                      </Text>
                      <Switch
                        checked={day.isWorkingDay}
                        disabled={!canEdit || updateCalendarDay.isPending}
                        label={day.isWorkingDay ? "Ngày làm việc" : "Ngày nghỉ"}
                        onChange={(event) => {
                          const nextWorking = event.currentTarget.checked;
                          void handleCalendarChange(
                            day.weekday,
                            nextWorking,
                            nextWorking ? (day.shiftId ?? shiftOptions[0]?.value ?? null) : null,
                          );
                        }}
                      />
                      <Select
                        placeholder="Chọn ca"
                        w={260}
                        data={shiftOptions}
                        value={day.shiftId}
                        disabled={
                          !canEdit || !day.isWorkingDay || updateCalendarDay.isPending
                        }
                        onChange={(value) => {
                          if (!value) {
                            return;
                          }
                          void handleCalendarChange(day.weekday, true, value);
                        }}
                      />
                      {day.shift ? (
                        <Text c="dimmed" size="sm">
                          {day.shift.dayValue} công
                        </Text>
                      ) : null}
                    </Group>
                  ))}
              </Stack>
            )}
          </Stack>
        </Card>
      </Stack>

      <Drawer
        opened={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
          form.reset();
        }}
        title={editing ? `Chỉnh sửa ca ${editing.code}` : "Tạo ca làm việc"}
        position="right"
        size="lg"
      >
        <form onSubmit={form.onSubmit((values) => void handleSubmit(values))}>
          <Stack gap="sm">
            <SimpleGrid cols={2} spacing="sm">
              <TextInput
                label="Mã ca"
                placeholder="HC"
                withAsterisk
                disabled={Boolean(editing)}
                {...form.getInputProps("code")}
              />
              <TextInput
                label="Tên ca"
                placeholder="Hành chính"
                withAsterisk
                {...form.getInputProps("name")}
              />
              <TextInput
                label="Giờ vào"
                placeholder="08:00"
                withAsterisk
                {...form.getInputProps("startTime")}
              />
              <TextInput
                label="Giờ ra"
                placeholder="17:30"
                withAsterisk
                {...form.getInputProps("endTime")}
              />
              <TextInput
                label="Bắt đầu nghỉ trưa"
                placeholder="12:00"
                {...form.getInputProps("breakStart")}
              />
              <TextInput
                label="Kết thúc nghỉ trưa"
                placeholder="13:00"
                {...form.getInputProps("breakEnd")}
              />
            </SimpleGrid>

            <Switch
              label="Nghỉ trưa bị trừ vào giờ làm"
              {...form.getInputProps("breakDeducted", { type: "checkbox" })}
            />

            <SimpleGrid cols={2} spacing="sm">
              <NumberInput
                label="Số phút công chuẩn"
                withAsterisk
                min={1}
                max={1440}
                {...form.getInputProps("standardMinutes")}
              />
              <NumberInput
                label="Số công của ca"
                description="Thứ 7 làm 4 tiếng vẫn để 1 — tính cả ngày công"
                min={0}
                max={2}
                step={0.5}
                decimalScale={1}
                {...form.getInputProps("dayValue")}
              />
              <NumberInput
                label="Ngưỡng đi muộn theo quy định (phút)"
                description="Cố định toàn công ty: check-in từ 08:15 tính đi muộn"
                min={0}
                max={240}
                disabled
                {...form.getInputProps("lateThresholdMinutes")}
              />
              <NumberInput
                label="Ngưỡng đánh dấu về sớm (phút)"
                min={0}
                max={240}
                {...form.getInputProps("earlyLeaveThresholdMinutes")}
              />
            </SimpleGrid>

            <Textarea label="Ghi chú" minRows={2} {...form.getInputProps("note")} />

            {editing ? (
              <Select
                label="Trạng thái"
                data={[
                  { value: "ACTIVE", label: "Đang áp dụng" },
                  { value: "INACTIVE", label: "Tạm ngưng" },
                ]}
                {...form.getInputProps("status")}
              />
            ) : null}

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setDrawerOpen(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                loading={createShift.isPending || updateShift.isPending}
                disabled={!canEdit}
              >
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>
    </>
  );
}
