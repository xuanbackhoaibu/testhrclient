import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
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
  endTime: "17:00",
  breakStart: "12:00",
  breakEnd: "13:00",
  breakDeducted: true,
  standardMinutes: 480,
  dayValue: 1,
  lateThresholdMinutes: 10,
  earlyLeaveThresholdMinutes: 10,
  note: "",
  status: "ACTIVE",
};

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function shiftKind(shift: WorkShift) {
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  if (end <= start) return { label: "Ca đêm", color: "indigo" };
  if (shift.breakStart && shift.breakEnd && toMinutes(shift.breakEnd) - toMinutes(shift.breakStart) >= 120) {
    return { label: "Ca gãy", color: "orange" };
  }
  return { label: "Ca ngày", color: "green" };
}

function TimelineSegment({ left, width }: { left: number; width: number }) {
  return <span className="work-shift-time-segment" style={{ left: `${left}%`, width: `${width}%` }} />;
}

function ShiftTimeline({ shift }: { shift: WorkShift }) {
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const segments =
    end <= start
      ? [
          { left: (start / 1440) * 100, width: ((1440 - start) / 1440) * 100 },
          { left: 0, width: (end / 1440) * 100 },
        ]
      : [{ left: (start / 1440) * 100, width: ((end - start) / 1440) * 100 }];

  return (
    <Box className="work-shift-timebar">
      <div className="work-shift-timebar-track">
        {segments.map((segment, index) => (
          <TimelineSegment key={index} left={segment.left} width={segment.width} />
        ))}
      </div>
      <Group justify="space-between" mt={4}>
        {["0h", "6h", "12h", "18h", "24h"].map((label) => (
          <Text key={label} size="10px" c="dimmed">{label}</Text>
        ))}
      </Group>
    </Box>
  );
}

function ShiftVisualCard({ shift, onEdit, canEdit }: { shift: WorkShift; onEdit: (shift: WorkShift) => void; canEdit: boolean }) {
  const kind = shiftKind(shift);
  const markOnly = shift.lateThresholdMinutes > 0 || shift.earlyLeaveThresholdMinutes > 0;

  return (
    <Paper withBorder p="md" className="work-shift-card">
      <Group justify="space-between" align="flex-start" mb="sm">
        <Box>
          <Group gap="xs">
            <Text fw={800}>{shift.name}</Text>
            <Badge variant="light" color={kind.color}>{kind.label}</Badge>
          </Group>
          <Text size="xs" c="dimmed" ff="monospace">{shift.code}</Text>
        </Box>
        <StatusTag status={shift.status} />
      </Group>

      <ShiftTimeline shift={shift} />

      <Group gap="xs" mt="sm">
        <Badge variant="light">{shift.startTime} - {shift.endTime}</Badge>
        <Badge variant="light" color="gray">{shift.standardMinutes} phút</Badge>
        <Badge variant="light" color="blue">{shift.dayValue} công</Badge>
      </Group>

      <Divider my="sm" />

      <Group justify="space-between" align="center">
        <Tooltip label="Ngưỡng hiện chỉ đánh dấu đi muộn/về sớm, chưa trừ công">
          <Badge variant="light" color={markOnly ? "orange" : "gray"}>
            Muộn/sớm: {shift.lateThresholdMinutes}' / {shift.earlyLeaveThresholdMinutes}'
          </Badge>
        </Tooltip>
        <Button size="xs" variant="subtle" disabled={!canEdit} onClick={() => onEdit(shift)}>
          Sửa
        </Button>
      </Group>
    </Paper>
  );
}

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
          title="Ngưỡng đi muộn / về sớm hiện chỉ để ĐÁNH DẤU"
        >
          Hệ thống ghi nhận và hiển thị số phút đi muộn / về sớm nhưng{" "}
          <b>chưa trừ công</b> — HR chưa ban hành mức xử lý. Khi có quyết định,
          chỉ cần sửa ngưỡng ở đây, không phải sửa phần mềm.
        </Alert>

        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
          {(shiftsQuery.data ?? []).map((shift) => (
            <ShiftVisualCard key={shift.id} shift={shift} onEdit={openEdit} canEdit={canEdit} />
          ))}
        </SimpleGrid>

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

        <Card withBorder padding="lg" radius="md" className="work-week-card">
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
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
                {(calendarQuery.data ?? [])
                  .slice()
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((day) => (
                    <Paper key={day.weekday} withBorder p="sm" className="work-week-day">
                      <Group justify="space-between" mb="xs">
                        <Text fw={700}>{WEEKDAY_LABELS[day.weekday]}</Text>
                        <Badge size="xs" color={day.isWorkingDay ? "green" : "gray"} variant="light">
                          {day.isWorkingDay ? "Làm" : "Nghỉ"}
                        </Badge>
                      </Group>
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
                        mt="xs"
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
                        <Text c="dimmed" size="xs" mt={6}>
                          {day.shift.code} - {day.shift.dayValue} công
                        </Text>
                      ) : null}
                    </Paper>
                  ))}
              </SimpleGrid>
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
                placeholder="17:00"
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
                label="Ngưỡng đánh dấu đi muộn (phút)"
                min={0}
                max={240}
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
