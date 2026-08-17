import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarTime,
  IconEdit,
  IconInfoCircle,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  useCreateWorkShift,
  useDeleteWorkShift,
  useUpdateWorkCalendarDay,
  useUpdateWorkShift,
  useWorkCalendar,
  useWorkShifts,
} from "../../features/attendance/useWorkSchedule";
import {
  getWorkShiftCatalogOrder,
  sortWorkShiftCatalog,
} from "../../features/attendance/workShiftCatalogOrder";
import { buildShiftAssignmentUrl } from "../../features/attendance/shiftAssignmentNavigation";
import { addMinutesToTime } from "../../features/attendance/shiftTime";
import {
  computeShiftWorkingMinutes,
  formatWorkingMinutes,
} from "../../features/attendance/shiftDuration";
import {
  WEEKDAY_LABELS,
  type WorkShift,
} from "../../features/attendance/workScheduleTypes";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { PageHeader } from "../../shared/components/PageHeader";
import { InfoBanner } from "../../shared/components/InfoBanner";
import { TimeField } from "../../shared/components/TimeField";
import formStyles from "./components/WorkShiftForm.module.css";
import { StatusTag } from "../../shared/components/StatusTag";
import { TableActionsMenu } from "../../shared/components/TableActionsMenu";

interface ShiftFormValues {
  code: string;
  name: string;
  groupName: string;
  checkInStart: string;
  startTime: string;
  checkInEnd: string;
  endTime: string;
  checkOutStart: string;
  checkOutEnd: string;
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

function optionalTimeError(value: string, label: string): string | null {
  return !value || TIME_PATTERN.test(value)
    ? null
    : `${label} phải theo dạng HH:mm.`;
}

function minutesBetween(from: string, to: string): number | null {
  if (!TIME_PATTERN.test(from) || !TIME_PATTERN.test(to)) {
    return null;
  }
  const [fromHour, fromMinute] = from.split(":").map(Number);
  const [toHour, toMinute] = to.split(":").map(Number);
  return toHour * 60 + toMinute - (fromHour * 60 + fromMinute);
}

function isOvernightShift(startTime: string, endTime: string): boolean {
  return startTime >= endTime;
}

const emptyForm: ShiftFormValues = {
  code: "",
  name: "",
  groupName: "",
  checkInStart: "",
  startTime: "08:00",
  checkInEnd: "08:10",
  endTime: "17:00",
  checkOutStart: "16:50",
  checkOutEnd: "",
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

export function WorkShiftsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [editing, setEditing] = useState<WorkShift | null>(null);
  const [deleting, setDeleting] = useState<WorkShift | null>(null);

  const shiftsQuery = useWorkShifts();
  const calendarQuery = useWorkCalendar();
  const createShift = useCreateWorkShift();
  const deleteShift = useDeleteWorkShift();
  const updateShift = useUpdateWorkShift();
  const updateCalendarDay = useUpdateWorkCalendarDay();

  const form = useForm<ShiftFormValues>({
    initialValues: emptyForm,
    validate: {
      code: (value) => (value.trim() ? null : "Nhập mã ca."),
      breakEnd: (value, values) =>
        !value || TIME_PATTERN.test(value)
          ? Boolean(value) === Boolean(values.breakStart)
            ? null
            : "Khai đủ cả giờ bắt đầu và kết thúc nghỉ trưa."
          : "Giờ nghỉ trưa phải theo dạng HH:mm.",
      name: (value) => (value.trim() ? null : "Nhập tên ca."),
      checkInStart: (value) => optionalTimeError(value, "Bắt đầu check-in"),
      startTime: (value) =>
        TIME_PATTERN.test(value)
          ? null
          : "Giờ check-in chuẩn phải theo dạng HH:mm.",
      checkInEnd: (value) => optionalTimeError(value, "Kết thúc check-in"),
      endTime: (value) =>
        TIME_PATTERN.test(value)
          ? null
          : "Giờ check-out chuẩn phải theo dạng HH:mm.",
      checkOutStart: (value) => optionalTimeError(value, "Bắt đầu check-out"),
      checkOutEnd: (value) => optionalTimeError(value, "Kết thúc check-out"),
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
      sortWorkShiftCatalog(
        (shiftsQuery.data ?? []).filter((shift) => shift.status === "ACTIVE"),
      ).map((shift) => ({
        value: shift.id,
        label: `${getWorkShiftCatalogOrder(shift.code) ?? "—"} · ${shift.code} — ${shift.name}`,
      })),
    [shiftsQuery.data],
  );

  const orderedShifts = useMemo(
    () => sortWorkShiftCatalog(shiftsQuery.data),
    [shiftsQuery.data],
  );

  // Working minutes implied by the times on screen, so HR sees the result
  // before saving instead of multiplying hours by 60 themselves.
  const computedMinutes = computeShiftWorkingMinutes({
    startTime: form.values.startTime,
    endTime: form.values.endTime,
    breakStart: form.values.breakStart,
    breakEnd: form.values.breakEnd,
    breakDeducted: form.values.breakDeducted,
  });
  const standardMinutesAuto =
    computedMinutes !== null && computedMinutes === form.values.standardMinutes;

  // Keep the standard-minutes field in step with the times while HR has not
  // overridden it. Editing an existing shift starts from the stored value, so
  // the ref only unlocks once the times actually change in this session.
  const lastAutoMinutes = useRef<number | null>(null);
  useEffect(() => {
    if (computedMinutes === null) return;
    const current = form.values.standardMinutes;
    const untouched =
      lastAutoMinutes.current === null || current === lastAutoMinutes.current;
    if (untouched && current !== computedMinutes) {
      form.setFieldValue("standardMinutes", computedMinutes);
    }
    lastAutoMinutes.current = computedMinutes;
    // form identity is stable across renders in Mantine's useForm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedMinutes]);

  // handleSubmit derives the late threshold from the check-in window when one
  // is set, so the preview must show the same figure the shift will use.
  const checkInWindow = form.values.checkInEnd
    ? minutesBetween(form.values.startTime, form.values.checkInEnd)
    : null;
  const effectiveLateMinutes =
    checkInWindow !== null && checkInWindow >= 0
      ? checkInWindow
      : form.values.lateThresholdMinutes;
  const effectiveLateAt = addMinutesToTime(
    form.values.startTime,
    effectiveLateMinutes,
  );

  function openCreate() {
    setEditing(null);
    form.setValues(emptyForm);
    lastAutoMinutes.current = emptyForm.standardMinutes;
    setAdvancedOpen(false);
    setDrawerOpen(true);
  }

  const openEdit = useCallback(
    (shift: WorkShift) => {
      setEditing(shift);
      form.setValues({
        code: shift.code,
        name: shift.name,
        groupName: shift.groupName ?? "",
        checkInStart: shift.checkInStart ?? "",
        startTime: shift.startTime,
        checkInEnd: shift.checkInEnd ?? "",
        endTime: shift.endTime,
        checkOutStart: shift.checkOutStart ?? "",
        checkOutEnd: shift.checkOutEnd ?? "",
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
      // Treat the stored value as HR's own until the times change.
      lastAutoMinutes.current = shift.standardMinutes;
      setAdvancedOpen(
        Boolean(
          shift.checkInStart ||
            shift.checkInEnd ||
            shift.checkOutStart ||
            shift.checkOutEnd,
        ),
      );
      setDrawerOpen(true);
    },
    [form],
  );

  async function handleSubmit(values: ShiftFormValues) {
    const checkInWindowMinutes = values.checkInEnd
      ? minutesBetween(values.startTime, values.checkInEnd)
      : null;
    const checkOutWindowMinutes = values.checkOutStart
      ? minutesBetween(values.checkOutStart, values.endTime)
      : null;
    const payload = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      groupName: values.groupName.trim() || null,
      checkInStart: values.checkInStart || null,
      startTime: values.startTime,
      checkInEnd: values.checkInEnd || null,
      endTime: values.endTime,
      checkOutStart: values.checkOutStart || null,
      checkOutEnd: values.checkOutEnd || null,
      breakStart: values.breakStart || null,
      breakEnd: values.breakEnd || null,
      breakDeducted: values.breakDeducted,
      standardMinutes: values.standardMinutes,
      dayValue: values.dayValue,
      lateThresholdMinutes:
        checkInWindowMinutes !== null && checkInWindowMinutes >= 0
          ? checkInWindowMinutes
          : values.lateThresholdMinutes,
      earlyLeaveThresholdMinutes:
        checkOutWindowMinutes !== null && checkOutWindowMinutes >= 0
          ? checkOutWindowMinutes
          : values.earlyLeaveThresholdMinutes,
      note: values.note.trim() || null,
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
        message: editing
          ? "Mở Bảng công, chọn đúng tháng rồi Cập nhật bảng công. Ngày đã chốt hoặc HR sửa tay vẫn được giữ nguyên."
          : "Dùng biểu tượng Phân ca này ở dòng ca để gán theo đối tượng và thời hạn.",
      });
      setDrawerOpen(false);
      setEditing(null);
      form.reset();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không lưu được ca làm việc",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Kiểm tra lại mã ca (không trùng) và định dạng giờ HH:mm.",
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

  async function handleDelete() {
    if (!deleting) {
      return;
    }
    try {
      await deleteShift.mutateAsync(deleting.id);
      notifications.show({
        color: "green",
        title: "Đã xóa ca làm việc",
        message: `${deleting.code} đã được xóa khỏi danh mục.`,
      });
      setDeleting(null);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Không xóa được ca làm việc",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Ca đã được dùng có thể chỉ tạm ngưng để giữ lịch sử chấm công.",
      });
    }
  }

  const columns = useMemo<DataTableColumn<WorkShift>[]>(
    () => [
      {
        key: "catalogOrder",
        header: "TT",
        width: 52,
        align: "center",
        render: (record) => getWorkShiftCatalogOrder(record.code) ?? "—",
      },
      {
        key: "code",
        header: "Mã ca",
        width: 110,
        render: (record) => <Text fw={600}>{record.code}</Text>,
      },
      {
        key: "name",
        header: "Loại ca",
        minWidth: 220,
        render: (record) => (
          <Stack gap={4}>
            <Text fw={500}>{record.name}</Text>
            {isOvernightShift(record.startTime, record.endTime) ? (
              <Badge size="xs" variant="light" color="orange" w="fit-content">
                ca qua ngày
              </Badge>
            ) : null}
          </Stack>
        ),
      },
      {
        key: "group",
        header: "Nhóm",
        width: 130,
        render: (record) => record.groupName ?? "—",
      },
      {
        key: "hours",
        header: "Giờ ca",
        minWidth: 168,
        render: (record) => (
          <Stack gap={2}>
            <Text size="sm" fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
              {record.startTime} – {record.endTime}
            </Text>
            <Text size="xs" c="dimmed">
              {record.breakStart && record.breakEnd
                ? `Nghỉ ${record.breakStart}–${record.breakEnd}${record.breakDeducted ? " (trừ)" : ""}`
                : "Không nghỉ giữa ca"}
            </Text>
          </Stack>
        ),
      },
      {
        // The figure that decides whether a punch counts as late.
        key: "lateThreshold",
        header: "Ngưỡng muộn",
        width: 128,
        align: "center",
        render: (record) => (
          <Tooltip
            label={`Vào sau ${addMinutesToTime(record.startTime, record.lateThresholdMinutes)} mới bị đánh dấu đi muộn.`}
            withArrow
            openDelay={200}
          >
            <Stack gap={0} align="center">
              <Text size="sm" fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
                {record.lateThresholdMinutes} phút
              </Text>
              <Text size="xs" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
                sau {addMinutesToTime(record.startTime, record.lateThresholdMinutes)}
              </Text>
            </Stack>
          </Tooltip>
        ),
      },
      {
        key: "work",
        header: "Giờ / công",
        width: 125,
        render: (record) => (
          <Stack gap={2}>
            <Text>{formatWorkingMinutes(record.standardMinutes)}</Text>
            <Text size="sm" c="dimmed">
              {record.dayValue} công
            </Text>
          </Stack>
        ),
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
        width: 132,
        align: "right",
        render: (record) => (
          <TableActionsMenu
            actions={[
              {
                label: "Phân ca này",
                icon: <IconCalendarTime size={16} />,
                disabled: !canEdit || record.status !== "ACTIVE",
                onClick: () => navigate(buildShiftAssignmentUrl(record.id)),
              },
              {
                label: "Chỉnh sửa",
                icon: <IconEdit size={16} />,
                disabled: !canEdit,
                onClick: () => openEdit(record),
              },
              {
                label: "Xóa",
                icon: <IconTrash size={16} />,
                color: "red",
                disabled: !canEdit,
                onClick: () => setDeleting(record),
              },
            ]}
          />
        ),
      },
    ],
    [canEdit, navigate, openEdit],
  );

  return (
    <>
      <PageHeader
        title="Ca làm việc"
        subtitle="Khai báo mẫu giờ công tái sử dụng. Sau đó dùng “Phân ca này” để gán mẫu cho đúng đối tượng theo khoảng hiệu lực."
        actions={
          canEdit ? (
            <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
              Tạo ca làm việc
            </Button>
          ) : null
        }
      />

      <Stack gap="sm">
        <InfoBanner
          title="Quy tắc chấm công: quá ngưỡng ca mới tính đi muộn"
          collapsible
        >
          Mốc check-in/check-out ở giữa là giờ chuẩn của ca. Nếu nhập mốc đóng
          check-in hoặc mở check-out, hệ thống tự dùng chênh lệch đó làm ngưỡng
          đánh dấu đi muộn/về sớm; hiện chỉ ghi nhận, <b>chưa trừ công</b>.
          <br />
          Ca kết thúc sang ngày hôm sau được lưu để quản lý danh mục, nhưng chưa
          thể phân ca: bộ tính công hiện tại chỉ xử lý một ngày. Các ca này được
          đánh dấu tạm ngưng để không chấm công sai.
        </InfoBanner>

        <DataTable
          data={orderedShifts}
          columns={columns}
          rowKey={(record) => record.id}
          loading={shiftsQuery.isLoading}
          error={shiftsQuery.error}
          onRetry={() => void shiftsQuery.refetch()}
          emptyTitle="Chưa khai báo ca làm việc"
          emptyDescription="Tạo ca trước, rồi dùng “Phân ca này” để gán cho nhóm đã được HR chốt giờ làm."
        />

        <Card withBorder padding="lg" radius="md">
          <Stack gap="sm">
            <div>
              <Title order={4} size="h5">
                Lịch tuần mặc định
              </Title>
              <Text c="dimmed" size="sm">
                Là mẫu lịch để HR tham chiếu khi phân ca. Nhân sự thực tế cần
                được gán ca hiệu lực; nếu chưa gán, BCC hiển thị “chưa phân ca”
                và không tự tính công. Ngày lễ luôn phủ lên lịch này.
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
                            nextWorking
                              ? (day.shiftId ?? shiftOptions[0]?.value ?? null)
                              : null,
                          );
                        }}
                      />
                      <Select
                        placeholder="Chọn ca"
                        w={260}
                        data={shiftOptions}
                        value={day.shiftId}
                        disabled={
                          !canEdit ||
                          !day.isWorkingDay ||
                          updateCalendarDay.isPending
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
            <div className={formStyles.row} data-cols="2">
              <TextInput
                label="Mã ca"
                placeholder="HC1"
                description="Chữ in hoa, không dấu. Không sửa được sau khi tạo."
                withAsterisk
                disabled={Boolean(editing)}
                {...form.getInputProps("code")}
              />
              <TextInput
                label="Tên ca"
                placeholder="Ca hành chính vào 7h30"
                description="Tên hiển thị trên bảng công và khi phân ca."
                withAsterisk
                {...form.getInputProps("name")}
              />
            </div>

            <div className={formStyles.row} data-cols="2">
              <TextInput
                label="Nhóm ca"
                placeholder="Hành chính / Nhà máy"
                description="Dùng để gom nhóm trong danh sách. Có thể bỏ trống."
                {...form.getInputProps("groupName")}
              />
              <div />
            </div>

            <div className={formStyles.section}>
              <div className={formStyles.sectionTitle}>Giờ làm việc</div>
              <p className={formStyles.sectionHint}>
                Giờ nhân viên phải có mặt và được tan ca.
              </p>
            </div>

            <div className={formStyles.row} data-cols="2">
              <TimeField
                label="Giờ vào ca"
                withAsterisk
                value={form.values.startTime}
                onChange={(value) => form.setFieldValue("startTime", value)}
                error={form.errors.startTime}
              />
              <TimeField
                label="Giờ tan ca"
                withAsterisk
                value={form.values.endTime}
                onChange={(value) => form.setFieldValue("endTime", value)}
                error={form.errors.endTime}
              />
            </div>

            <div className={formStyles.section}>
              <div className={formStyles.sectionTitle}>Nghỉ giữa ca</div>
              <p className={formStyles.sectionHint}>
                Bỏ trống nếu ca không có giờ nghỉ, ví dụ ca sáng thứ 7.
              </p>
            </div>

            <div className={formStyles.row} data-cols="2">
              <TimeField
                label="Bắt đầu nghỉ"
                value={form.values.breakStart}
                onChange={(value) => form.setFieldValue("breakStart", value)}
                error={form.errors.breakStart}
              />
              <TimeField
                label="Kết thúc nghỉ"
                value={form.values.breakEnd}
                onChange={(value) => form.setFieldValue("breakEnd", value)}
                error={form.errors.breakEnd}
              />
            </div>

            <Switch
              label="Trừ giờ nghỉ khỏi giờ công"
              description="Tắt nếu công ty vẫn tính công cho giờ nghỉ."
              {...form.getInputProps("breakDeducted", { type: "checkbox" })}
            />

            {/* Shows what the entered times add up to, before saving. */}
            <div
              className={formStyles.preview}
              data-tone={computedMinutes === null ? "pending" : undefined}
            >
              {computedMinutes === null ? (
                <span className={formStyles.previewLabel}>
                  Nhập giờ vào ca và giờ tan ca để xem giờ công.
                </span>
              ) : (
                <>
                  <span className={formStyles.previewItem}>
                    <span className={formStyles.previewLabel}>Giờ công mỗi ngày</span>
                    <span className={formStyles.previewValue}>
                      {formatWorkingMinutes(computedMinutes)}
                    </span>
                  </span>
                  <span className={formStyles.previewItem}>
                    <span className={formStyles.previewLabel}>Tính đi muộn khi vào sau</span>
                    <span className={formStyles.previewValue}>{effectiveLateAt}</span>
                  </span>
                  <span className={formStyles.previewItem}>
                    <span className={formStyles.previewLabel}>Số công</span>
                    <span className={formStyles.previewValue}>
                      {form.values.dayValue}
                    </span>
                  </span>
                </>
              )}
            </div>

            {isOvernightShift(form.values.startTime, form.values.endTime) ? (
              <InfoBanner tone="info" title="Ca kết thúc sang ngày hôm sau">
                Giờ ra được tính sang ngày kế tiếp
                {computedMinutes !== null
                  ? `, nên giờ công của ca là ${formatWorkingMinutes(computedMinutes)}`
                  : ""}
                . Ca vẫn kích hoạt và phân ca bình thường.
              </InfoBanner>
            ) : null}

            <div className={formStyles.section}>
              <div className={formStyles.sectionTitle}>Quy tắc chấm công</div>
              <p className={formStyles.sectionHint}>
                Chỉ đánh dấu để HR rà soát, hệ thống chưa tự trừ công.
              </p>
            </div>

            <div className={formStyles.row} data-cols="2">
              <NumberInput
                label="Đi muộn quá (phút)"
                description="Vào trong khoảng này vẫn coi là đúng giờ."
                min={0}
                max={240}
                {...form.getInputProps("lateThresholdMinutes")}
              />
              <NumberInput
                label="Về sớm quá (phút)"
                description="Về trong khoảng này vẫn coi là đủ giờ."
                min={0}
                max={240}
                {...form.getInputProps("earlyLeaveThresholdMinutes")}
              />
            </div>

            <div className={formStyles.row} data-cols="2">
              <NumberInput
                label="Số công của ca"
                description="Thứ 7 làm 4 tiếng vẫn để 1 nếu tính đủ ngày công."
                min={0}
                max={3}
                step={0.5}
                decimalScale={1}
                {...form.getInputProps("dayValue")}
              />
              <NumberInput
                label="Giờ công chuẩn (phút)"
                description={
                  standardMinutesAuto
                    ? "Hệ thống tự tính từ giờ ca."
                    : "Đang nhập tay, khác với giờ ca."
                }
                min={1}
                max={1440}
                {...form.getInputProps("standardMinutes")}
              />
            </div>

            <div className={formStyles.advanced}>
              <UnstyledButton
                className={formStyles.advancedToggle}
                onClick={() => setAdvancedOpen((value) => !value)}
                aria-expanded={advancedOpen}
              >
                {advancedOpen ? "Ẩn" : "Mở"} thiết lập nâng cao — khẩu độ máy chấm công
              </UnstyledButton>

              {advancedOpen ? (
                <Stack gap="sm" mt="sm">
                  <Text size="xs" c="dimmed">
                    Khoảng thời gian máy chấm công nhận dữ liệu. Bỏ trống nếu
                    không giới hạn. Lưu ý: nếu điền “Đóng nhận vào ca”, hệ thống
                    lấy khoảng từ giờ vào ca tới mốc đó làm ngưỡng đi muộn, thay
                    cho ô “Đi muộn quá (phút)” ở trên.
                  </Text>

                  <div className={formStyles.row} data-cols="2">
                    <TimeField
                      label="Mở nhận vào ca"
                      value={form.values.checkInStart}
                      onChange={(value) => form.setFieldValue("checkInStart", value)}
                      error={form.errors.checkInStart}
                    />
                    <TimeField
                      label="Đóng nhận vào ca"
                      value={form.values.checkInEnd}
                      onChange={(value) => form.setFieldValue("checkInEnd", value)}
                      error={form.errors.checkInEnd}
                    />
                  </div>

                  <div className={formStyles.row} data-cols="2">
                    <TimeField
                      label="Mở nhận tan ca"
                      value={form.values.checkOutStart}
                      onChange={(value) => form.setFieldValue("checkOutStart", value)}
                      error={form.errors.checkOutStart}
                    />
                    <TimeField
                      label="Đóng nhận tan ca"
                      value={form.values.checkOutEnd}
                      onChange={(value) => form.setFieldValue("checkOutEnd", value)}
                      error={form.errors.checkOutEnd}
                    />
                  </div>
                </Stack>
              ) : null}
            </div>

            <Textarea
              label="Ghi chú"
              placeholder="Ví dụ: áp dụng cho khối văn phòng từ tháng 9."
              minRows={2}
              {...form.getInputProps("note")}
            />

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

            <div className={formStyles.footer}>
              <Button variant="default" onClick={() => setDrawerOpen(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                loading={createShift.isPending || updateShift.isPending}
                disabled={!canEdit}
              >
                {editing ? "Lưu thay đổi" : "Tạo ca"}
              </Button>
            </div>
          </Stack>
        </form>
      </Drawer>

      <Modal
        opened={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Xóa ca làm việc"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            Xóa{" "}
            <b>
              {deleting?.code} — {deleting?.name}
            </b>{" "}
            khỏi danh mục?
          </Text>
          <Alert
            color="orange"
            variant="light"
            icon={<IconInfoCircle size={18} />}
          >
            Chỉ xóa được ca chưa từng được phân, đưa vào lịch tuần hoặc dùng
            trên bảng công. Ca đã dùng chỉ có thể tạm ngưng để giữ đúng lịch sử.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setDeleting(null)}
              disabled={deleteShift.isPending}
            >
              Hủy
            </Button>
            <Button
              color="red"
              loading={deleteShift.isPending}
              onClick={() => void handleDelete()}
            >
              Xóa ca
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
