import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import { IconCalendarCheck, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  rejectLeaveRequest,
  submitLeaveRequest,
} from "../../features/leave/leaveApi";
import type { LeaveRequest, LeaveRequestPayload } from "../../features/leave/leaveTypes";
import { useLeaveRequests } from "../../features/leave/useLeaveRequests";
import { ConfirmActionModal } from "../../shared/components/ConfirmActionModal";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { TableActionsMenu, type TableActionItem } from "../../shared/components/TableActionsMenu";
import { LEAVE_TYPE_OPTIONS } from "../../shared/constants/statuses";
import { mockEmployees } from "../../shared/mocks/mockEmployees";
import { formatDate } from "../../shared/utils/date";

const LEAVE_STATUS_OPTIONS = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"];

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Nghỉ phép năm",
  SICK: "Nghỉ ốm",
  UNPAID: "Nghỉ không lương",
  MATERNITY: "Nghỉ thai sản",
};

type ConfirmState =
  | { action: "submit" | "approve" | "reject" | "cancel"; record: LeaveRequest }
  | null;

const CONFIRM_COPY: Record<
  NonNullable<ConfirmState>["action"],
  { title: string; message: (record: LeaveRequest) => string; confirmLabel: string; color: string }
> = {
  submit: {
    title: "Gửi duyệt yêu cầu nghỉ phép",
    message: (record) => `Gửi yêu cầu nghỉ phép của ${record.employeeName} để chờ duyệt?`,
    confirmLabel: "Gửi duyệt",
    color: "blue",
  },
  approve: {
    title: "Duyệt yêu cầu nghỉ phép",
    message: (record) => `Duyệt yêu cầu nghỉ phép của ${record.employeeName}?`,
    confirmLabel: "Duyệt",
    color: "green",
  },
  reject: {
    title: "Từ chối yêu cầu nghỉ phép",
    message: (record) => `Từ chối yêu cầu nghỉ phép của ${record.employeeName}?`,
    confirmLabel: "Từ chối",
    color: "red",
  },
  cancel: {
    title: "Hủy yêu cầu nghỉ phép",
    message: (record) => `Hủy yêu cầu nghỉ phép của ${record.employeeName}?`,
    confirmLabel: "Hủy yêu cầu",
    color: "orange",
  },
};

export function LeavePage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [opened, setOpened] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [search, setSearch] = useState("");
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    leaveType: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = useLeaveRequests({ ...params, search });

  const form = useForm<LeaveRequestPayload>({
    initialValues: {
      employeeId: "",
      leaveType: "",
      startDate: "",
      endDate: "",
      totalDays: 1,
      reason: "",
    },
    validate: {
      employeeId: (value) => (value ? null : "Vui lòng chọn nhân viên"),
      leaveType: (value) => (value ? null : "Vui lòng chọn loại nghỉ"),
      startDate: (value) => (value ? null : "Vui lòng chọn ngày bắt đầu"),
      endDate: (value, values) => {
        if (!value) return "Vui lòng chọn ngày kết thúc";
        if (values.startDate && dayjs(value).isBefore(dayjs(values.startDate), "day")) {
          return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu";
        }
        return null;
      },
      totalDays: (value) => (value && value > 0 ? null : "Số ngày nghỉ phải lớn hơn 0"),
      reason: (value) => (value.trim() ? null : "Vui lòng nhập lý do nghỉ"),
    },
  });

  const createMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Đã tạo yêu cầu nghỉ phép." });
      setOpened(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: () => {
      notifications.show({ color: "red", message: "Không tạo được yêu cầu nghỉ phép." });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: NonNullable<ConfirmState>["action"] }) => {
      switch (action) {
        case "submit":
          return submitLeaveRequest(id);
        case "approve":
          return approveLeaveRequest(id);
        case "reject":
          return rejectLeaveRequest(id);
        default:
          return cancelLeaveRequest(id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      setConfirmState(null);
    },
    onError: () => {
      notifications.show({ color: "red", message: "Không cập nhật được trạng thái." });
    },
  });

  const employeeOptions = useMemo(
    () => mockEmployees.map((item) => ({ value: item.id, label: `${item.fullName} (${item.employeeCode})` })),
    [],
  );

  const columns: DataTableColumn<LeaveRequest>[] = [
    { key: "employeeName", header: "Nhân viên", render: (record) => record.employeeName },
    {
      key: "leaveType",
      header: "Loại nghỉ",
      render: (record) => LEAVE_TYPE_LABELS[record.leaveType] ?? record.leaveType,
    },
    {
      key: "range",
      header: "Thời gian nghỉ",
      render: (record) => (
        <Text size="sm">
          {formatDate(record.startDate)} → {formatDate(record.endDate)}
        </Text>
      ),
    },
    {
      key: "totalDays",
      header: "Số ngày",
      align: "center",
      render: (record) => <Badge variant="light" color="blue">{record.totalDays}</Badge>,
    },
    { key: "status", header: "Trạng thái", render: (record) => <StatusTag status={record.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      width: 120,
      render: (record) => {
        const actions: TableActionItem[] = [];
        if (record.status === "DRAFT" && can(HR_PERMISSIONS.LEAVE_SUBMIT)) {
          actions.push({ label: "Gửi duyệt", onClick: () => setConfirmState({ action: "submit", record }) });
        }
        if (record.status === "SUBMITTED" && can(HR_PERMISSIONS.LEAVE_APPROVE)) {
          actions.push({ label: "Duyệt", color: "green", onClick: () => setConfirmState({ action: "approve", record }) });
        }
        if (record.status === "SUBMITTED" && can(HR_PERMISSIONS.LEAVE_REJECT)) {
          actions.push({ label: "Từ chối", color: "red", onClick: () => setConfirmState({ action: "reject", record }) });
        }
        if (["DRAFT", "SUBMITTED"].includes(record.status) && can(HR_PERMISSIONS.LEAVE_CANCEL)) {
          actions.push({ label: "Hủy", color: "orange", onClick: () => setConfirmState({ action: "cancel", record }) });
        }
        return <TableActionsMenu actions={actions} />;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Nghỉ phép"
        subtitle="Theo dõi và xử lý các yêu cầu nghỉ phép của nhân viên."
        actions={
          can(HR_PERMISSIONS.LEAVE_CREATE) ? (
            <Button leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
              Tạo yêu cầu
            </Button>
          ) : undefined
        }
      />

      <Paper p="md" radius="lg" withBorder mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
          <NormalizedSearchInput
            label="Tìm kiếm"
            placeholder="Tên nhân viên, lý do..."
            value={search}
            onChange={setSearch}
          />
          <Select
            label="Nhân viên"
            placeholder="Tất cả"
            clearable
            data={employeeOptions}
            onChange={(value) => setParams((current) => ({ ...current, page: 1, employeeId: value ?? undefined }))}
          />
          <Select
            label="Loại nghỉ"
            placeholder="Tất cả"
            clearable
            data={LEAVE_TYPE_OPTIONS.map((item) => ({ value: item, label: LEAVE_TYPE_LABELS[item] ?? item }))}
            onChange={(value) => setParams((current) => ({ ...current, page: 1, leaveType: value ?? undefined }))}
          />
          <Select
            label="Trạng thái"
            placeholder="Tất cả"
            clearable
            data={LEAVE_STATUS_OPTIONS.map((item) => ({ value: item, label: item }))}
            onChange={(value) => setParams((current) => ({ ...current, page: 1, status: value ?? undefined }))}
          />
        </SimpleGrid>
      </Paper>

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        rowKey={(record) => record.id}
        loading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        meta={data?.pagination}
        onPageChange={(page, pageSize) => setParams((current) => ({ ...current, page, pageSize }))}
        emptyTitle="Chưa có yêu cầu nghỉ phép"
        emptyDescription="Không có yêu cầu nào khớp với bộ lọc hiện tại."
      />

      <Drawer
        opened={opened}
        onClose={() => {
          setOpened(false);
          form.reset();
        }}
        title="Tạo yêu cầu nghỉ phép"
        position="right"
        size="md"
      >
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack gap="md">
            <Select
              label="Nhân viên"
              placeholder="Chọn nhân viên"
              required
              data={employeeOptions}
              {...form.getInputProps("employeeId")}
            />
            <Select
              label="Loại nghỉ"
              placeholder="Chọn loại nghỉ"
              required
              data={LEAVE_TYPE_OPTIONS.map((item) => ({ value: item, label: LEAVE_TYPE_LABELS[item] ?? item }))}
              {...form.getInputProps("leaveType")}
            />
            <Group grow>
              <DateInput
                label="Ngày bắt đầu"
                placeholder="dd/mm/yyyy"
                required
                valueFormat="DD/MM/YYYY"
                value={form.values.startDate ? new Date(form.values.startDate) : null}
                onChange={(value) =>
                  form.setFieldValue("startDate", value ? dayjs(value as unknown as string).format("YYYY-MM-DD") : "")
                }
                error={form.errors.startDate}
              />
              <DateInput
                label="Ngày kết thúc"
                placeholder="dd/mm/yyyy"
                required
                valueFormat="DD/MM/YYYY"
                value={form.values.endDate ? new Date(form.values.endDate) : null}
                onChange={(value) =>
                  form.setFieldValue("endDate", value ? dayjs(value as unknown as string).format("YYYY-MM-DD") : "")
                }
                error={form.errors.endDate}
              />
            </Group>
            <NumberInput
              label="Số ngày nghỉ"
              required
              min={0.5}
              step={0.5}
              {...form.getInputProps("totalDays")}
            />
            <Textarea label="Lý do" placeholder="Nhập lý do nghỉ phép" required minRows={3} {...form.getInputProps("reason")} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setOpened(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={createMutation.isPending} leftSection={<IconCalendarCheck size={16} />}>
                Lưu yêu cầu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <ConfirmActionModal
        opened={Boolean(confirmState)}
        title={confirmState ? CONFIRM_COPY[confirmState.action].title : ""}
        message={confirmState ? CONFIRM_COPY[confirmState.action].message(confirmState.record) : ""}
        confirmLabel={confirmState ? CONFIRM_COPY[confirmState.action].confirmLabel : "Xác nhận"}
        color={confirmState ? CONFIRM_COPY[confirmState.action].color : "blue"}
        loading={statusMutation.isPending}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (confirmState) {
            statusMutation.mutate({ id: confirmState.record.id, action: confirmState.action });
          }
        }}
      />
    </>
  );
}
