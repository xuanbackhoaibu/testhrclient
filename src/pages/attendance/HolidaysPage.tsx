import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  useCloneHolidays,
  useCreateHoliday,
  useDeleteHoliday,
  useHolidays,
} from "../../features/attendance/useWorkSchedule";
import {
  WEEKDAY_LABELS,
  type Holiday,
} from "../../features/attendance/workScheduleTypes";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { PageHeader } from "../../shared/components/PageHeader";
import { TableActionsMenu } from "../../shared/components/TableActionsMenu";

interface HolidayFormValues {
  date: string;
  name: string;
  isPaid: boolean;
  note: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const currentYear = new Date().getFullYear();

const yearOptions = Array.from({ length: 7 }, (_, index) => {
  const year = currentYear - 2 + index;
  return { value: String(year), label: String(year) };
});

function formatDisplayDate(isoDate: string): string {
  const date = new Date(isoDate);
  const weekday = WEEKDAY_LABELS[date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()} (${weekday})`;
}

export function HolidaysPage() {
  const { can } = useAuth();
  const canEdit = can(HR_PERMISSIONS.ATTENDANCE_UPDATE);

  const [year, setYear] = useState(currentYear);
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [deleting, setDeleting] = useState<Holiday | null>(null);
  const [cloneFromYear, setCloneFromYear] = useState(currentYear);
  const [cloneToYear, setCloneToYear] = useState(currentYear + 1);

  const holidaysQuery = useHolidays(year);
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const cloneHolidays = useCloneHolidays();

  const form = useForm<HolidayFormValues>({
    initialValues: { date: "", name: "", isPaid: true, note: "" },
    validate: {
      date: (value) =>
        DATE_PATTERN.test(value) ? null : "Ngày phải theo dạng YYYY-MM-DD.",
      name: (value) => (value.trim() ? null : "Nhập tên ngày lễ."),
    },
  });

  // Lễ nhân bản từ năm trước có thể sai ngày với lễ âm lịch — backend đã ghi
  // note nhắc, đếm lại ở đây để HR thấy ngay còn bao nhiêu dòng chưa soát.
  const needsReviewCount = useMemo(
    () =>
      (holidaysQuery.data ?? []).filter((holiday) =>
        holiday.note?.includes("kiểm tra"),
      ).length,
    [holidaysQuery.data],
  );

  async function handleCreate(values: HolidayFormValues) {
    try {
      await createHoliday.mutateAsync({
        date: values.date,
        name: values.name.trim(),
        isPaid: values.isPaid,
        note: values.note.trim() || undefined,
      });
      notifications.show({
        color: "green",
        title: "Đã thêm ngày lễ",
        message: "Chấm công sẽ không báo vắng mặt vào ngày này.",
      });
      setCreateOpen(false);
      form.reset();
    } catch {
      notifications.show({
        color: "red",
        title: "Không thêm được ngày lễ",
        message: "Ngày này có thể đã được khai rồi.",
      });
    }
  }

  async function handleClone() {
    try {
      const result = await cloneHolidays.mutateAsync({
        fromYear: cloneFromYear,
        toYear: cloneToYear,
      });
      notifications.show({
        color: "green",
        title: `Đã nhân bản ${result.created} ngày lễ`,
        message:
          result.skipped > 0
            ? `Bỏ qua ${result.skipped} ngày đã tồn tại. Nhớ soát lại các lễ âm lịch.`
            : "Nhớ soát lại ngày của các lễ âm lịch (Tết, Giỗ Tổ).",
      });
      setCloneOpen(false);
      setYear(cloneToYear);
    } catch {
      notifications.show({
        color: "red",
        title: "Không nhân bản được",
        message: "Năm nguồn phải có sẵn ngày lễ và khác năm đích.",
      });
    }
  }

  async function handleDelete(holiday: Holiday) {
    try {
      await deleteHoliday.mutateAsync(holiday.id);
      notifications.show({
        color: "green",
        title: "Đã xóa ngày lễ",
        message: `${holiday.name} đã được gỡ khỏi lịch ${holiday.year}.`,
      });
      setDeleting(null);
    } catch {
      notifications.show({
        color: "red",
        title: "Không xóa được ngày lễ",
        message: "Vui lòng thử lại sau.",
      });
    }
  }

  const columns = useMemo<DataTableColumn<Holiday>[]>(
    () => [
      {
        key: "date",
        header: "Ngày",
        width: 200,
        render: (record) => <Text fw={600}>{formatDisplayDate(record.date)}</Text>,
      },
      { key: "name", header: "Tên ngày lễ", render: (record) => record.name },
      {
        key: "isPaid",
        header: "Hưởng lương",
        width: 130,
        render: (record) => (
          <Badge variant="light" color={record.isPaid ? "green" : "gray"}>
            {record.isPaid ? "Có" : "Không"}
          </Badge>
        ),
      },
      {
        key: "note",
        header: "Ghi chú",
        render: (record) =>
          record.note ? (
            <Text size="sm" c={record.note.includes("kiểm tra") ? "orange" : undefined}>
              {record.note}
            </Text>
          ) : (
            "-"
          ),
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
    [canEdit],
  );

  return (
    <>
      <PageHeader
        title="Ngày lễ"
        subtitle="Khai báo lịch nghỉ lễ theo năm. Ngày có trong danh sách này sẽ không bị chấm công báo vắng mặt hay thiếu chấm công."
        actions={
          canEdit ? (
            <>
              <Button
                variant="default"
                leftSection={<IconCopy size={18} />}
                onClick={() => setCloneOpen(true)}
              >
                Nhân bản từ năm trước
              </Button>
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                  form.reset();
                  setCreateOpen(true);
                }}
              >
                Thêm ngày lễ
              </Button>
            </>
          ) : null
        }
      />

      <Stack gap="md">
        {needsReviewCount > 0 ? (
          <Alert
            icon={<IconInfoCircle size={18} />}
            color="orange"
            variant="light"
            title={`${needsReviewCount} ngày lễ cần HR soát lại`}
          >
            Các ngày lễ <b>âm lịch</b> (Tết, Giỗ Tổ) không rơi vào cùng ngày
            dương lịch mỗi năm. Đối chiếu với thông báo nghỉ lễ chính thức rồi
            sửa lại ngày trước khi chốt bảng công.
          </Alert>
        ) : null}

        <Group>
          <Select
            label="Năm"
            w={140}
            data={yearOptions}
            value={String(year)}
            onChange={(value) => setYear(Number(value ?? currentYear))}
          />
        </Group>

        <DataTable
          data={holidaysQuery.data ?? []}
          columns={columns}
          rowKey={(record) => record.id}
          loading={holidaysQuery.isLoading}
          error={holidaysQuery.error}
          onRetry={() => void holidaysQuery.refetch()}
          emptyTitle={`Chưa khai báo ngày lễ năm ${year}`}
          emptyDescription="Thêm từng ngày, hoặc nhân bản từ năm trước rồi sửa lại các lễ âm lịch."
        />
      </Stack>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Thêm ngày lễ"
        centered
      >
        <form onSubmit={form.onSubmit((values) => void handleCreate(values))}>
          <Stack gap="sm">
            <TextInput
              label="Ngày"
              placeholder="2026-09-02"
              withAsterisk
              {...form.getInputProps("date")}
            />
            <TextInput
              label="Tên ngày lễ"
              placeholder="Quốc khánh"
              withAsterisk
              {...form.getInputProps("name")}
            />
            <Switch
              label="Có hưởng lương"
              {...form.getInputProps("isPaid", { type: "checkbox" })}
            />
            <Textarea label="Ghi chú" minRows={2} {...form.getInputProps("note")} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={createHoliday.isPending}>
                Thêm
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={cloneOpen}
        onClose={() => setCloneOpen(false)}
        title="Nhân bản ngày lễ"
        centered
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Chép toàn bộ ngày lễ của năm nguồn sang năm đích, giữ nguyên
            ngày–tháng. Ngày đã tồn tại ở năm đích sẽ được bỏ qua.
          </Text>
          <Group grow>
            <NumberInput
              label="Từ năm"
              value={cloneFromYear}
              onChange={(value) => setCloneFromYear(Number(value))}
            />
            <NumberInput
              label="Sang năm"
              value={cloneToYear}
              onChange={(value) => setCloneToYear(Number(value))}
            />
          </Group>
          <Alert color="orange" variant="light" icon={<IconInfoCircle size={18} />}>
            Chỉ đúng với <b>lễ dương lịch</b>. Tết và Giỗ Tổ phải sửa lại ngày
            sau khi nhân bản — mỗi dòng chép sang sẽ được đánh dấu nhắc.
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setCloneOpen(false)}>
              Hủy
            </Button>
            <Button loading={cloneHolidays.isPending} onClick={() => void handleClone()}>
              Nhân bản
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Xóa ngày lễ"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            Xóa <b>{deleting?.name}</b> khỏi lịch nghỉ? Sau khi xóa, ngày này sẽ
            được chấm công như ngày làm việc bình thường.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setDeleting(null)}>
              Hủy
            </Button>
            <Button
              color="red"
              loading={deleteHoliday.isPending}
              onClick={() => deleting && void handleDelete(deleting)}
            >
              Xóa
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
