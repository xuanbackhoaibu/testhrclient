import { useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Grid,
  Group,
  Modal,
  Paper,
  Select,
  Space,
  Steps,
  Table,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  approveMovement,
  cancelMovement,
  createMovement,
  rejectMovement,
  submitMovement,
} from "../../features/movements/movementsApi";
import type {
  Movement,
  MovementPayload,
} from "../../features/movements/movementTypes";
import { useMovements } from "../../features/movements/useMovements";
import { mockEmployees } from "../../shared/mocks/mockEmployees";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { HrmDateInput } from '../../shared/components/HrmDateInput';
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { MOVEMENT_TYPE_OPTIONS } from "../../shared/constants/statuses";
import { formatDate } from "../../shared/utils/date";
import { toast } from "../../shared/utils/toast";
import { useAuth } from "../../features/auth/useAuth";
import { HR_PERMISSIONS } from "../../features/auth/permissions";

export function MovementsPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const form = useForm<MovementPayload>({
    initialValues: {
      employeeId: "",
      movementType: "",
      effectiveDate: "",
      reason: "",
      afterJson: '{\n  "departmentId": "ou-sales"\n}',
    } as unknown as MovementPayload,
    validate: {
      employeeId: (value: string) => (value ? null : "Chọn nhân viên."),
      movementType: (value: string) => (value ? null : "Chọn loại điều chuyển."),
      effectiveDate: (value: string) => (value ? null : "Chọn ngày hiệu lực."),
      reason: (value: string) => (value?.trim() ? null : "Nhập lý do."),
      afterJson: (value: string) => {
        if (!value?.trim()) return "Nhập afterJson.";
        try {
          JSON.parse(value);
          return null;
        } catch {
          return "afterJson phải là JSON hợp lệ.";
        }
      },
    },
  });
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Movement | null>(null);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    movementType: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = useMovements(params);

  function movementStep(record: Movement): number {
    if (record.status === "APPROVED") return 2;
    if (record.status === "SUBMITTED") return 1;
    if (record.status === "REJECTED" || record.status === "CANCELLED") return 1;
    return 0;
  }

  const createMutation = useMutation({
    mutationFn: createMovement,
    onSuccess: async () => {
      toast.success("Đã tạo điều chuyển.");
      setOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["movements"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "submit" | "approve" | "reject" | "cancel";
    }) => {
      switch (action) {
        case "submit":
          return submitMovement(id);
        case "approve":
          return approveMovement(id);
        case "reject":
          return rejectMovement(id);
        default:
          return cancelMovement(id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["movements"] });
    },
  });

  const columns = useMemo<DataTableColumn<Movement>[]>(
    () => [
      { key: "employeeName", header: "Nhân viên", render: (record) => record.employeeName },
      { key: "movementType", header: "Loại", render: (record) => record.movementType },
      {
        key: "effectiveDate",
        header: "Ngày hiệu lực",
        render: (record) => formatDate(record.effectiveDate),
      },
      { key: "reason", header: "Lý do", render: (record) => record.reason },
      { key: "status", header: "Trạng thái", render: (record) => <StatusTag status={record.status} /> },
      {
        key: "actions",
        header: "Thao tác",
        render: (record) => (
          <Group gap="xs" wrap="wrap">
            <Button size="xs" variant="light" onClick={() => setSelected(record)}>
              Chi tiết
            </Button>
            {record.status === "DRAFT" && can(HR_PERMISSIONS.MOVEMENT_SUBMIT) ? (
              <Button
                size="xs"
                variant="light"
                onClick={() => statusMutation.mutate({ id: record.id, action: "submit" })}
              >
                Gửi duyệt
              </Button>
            ) : null}
            {record.status === "SUBMITTED" && can(HR_PERMISSIONS.MOVEMENT_APPROVE) ? (
              <Button
                size="xs"
                variant="light"
                onClick={() => statusMutation.mutate({ id: record.id, action: "approve" })}
              >
                Duyệt
              </Button>
            ) : null}
            {record.status === "SUBMITTED" && can(HR_PERMISSIONS.MOVEMENT_REJECT) ? (
              <Button
                size="xs"
                variant="light"
                color="red"
                onClick={() => statusMutation.mutate({ id: record.id, action: "reject" })}
              >
                Từ chối
              </Button>
            ) : null}
            {["DRAFT", "SUBMITTED"].includes(record.status) && can(HR_PERMISSIONS.MOVEMENT_CANCEL) ? (
              <Button
                size="xs"
                variant="default"
                onClick={() => statusMutation.mutate({ id: record.id, action: "cancel" })}
              >
                Hủy
              </Button>
            ) : null}
          </Group>
        ),
      },
    ],
    [can, statusMutation],
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader
        title="Điều chuyển"
        subtitle="Quy trình điều chuyển với các trạng thái gửi duyệt, duyệt, từ chối và hủy."
        actions={can(HR_PERMISSIONS.MOVEMENT_CREATE) ? (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setOpen(true)}
          >
            Tạo mới
          </Button>
        ) : undefined}
      />
      <Paper className="page-card" p="lg" radius="md">
        <Stack gap="md">
          <Grid gap="sm">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                clearable
                placeholder="Nhân viên"
                aria-label="Lọc theo nhân viên"
                searchable
                data={mockEmployees.map((item) => ({
                  value: item.id,
                  label: item.fullName,
                }))}
                value={params.employeeId ?? null}
                onChange={(value) =>
                  setParams((current) => ({ ...current, page: 1, employeeId: value ?? undefined }))
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                clearable
                placeholder="Loại điều chuyển"
                aria-label="Lọc theo loại điều chuyển"
                data={[...MOVEMENT_TYPE_OPTIONS]}
                value={params.movementType ?? null}
                onChange={(value) =>
                  setParams((current) => ({ ...current, page: 1, movementType: value ?? undefined }))
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                clearable
                placeholder="Trạng thái"
                aria-label="Lọc theo trạng thái"
                data={["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"]}
                value={params.status ?? null}
                onChange={(value) =>
                  setParams((current) => ({ ...current, page: 1, status: value ?? undefined }))
                }
              />
            </Grid.Col>
          </Grid>

          <DataTable
            data={data.items}
            columns={columns}
            rowKey={(record) => record.id}
            meta={data.pagination}
            onPageChange={(page, pageSize) =>
              setParams((current) => ({ ...current, page, pageSize }))
            }
            emptyTitle="Chưa có điều chuyển"
            emptyDescription="Không có bản ghi điều chuyển phù hợp với bộ lọc hiện tại."
          />
        </Stack>
      </Paper>

      <Drawer
        title="Tạo điều chuyển"
        opened={open}
        position="right"
        size={520}
        onClose={() => {
          setOpen(false);
          form.reset();
        }}
      >
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack gap="md">
            <Select
              label="Nhân viên"
              withAsterisk
              searchable
              data={mockEmployees.map((item) => ({
                value: item.id,
                label: item.fullName,
              }))}
              {...form.getInputProps("employeeId")}
            />
            <Select
              label="Loại điều chuyển"
              withAsterisk
              data={[...MOVEMENT_TYPE_OPTIONS]}
              {...form.getInputProps("movementType")}
            />
            <HrmDateInput
              label="Ngày hiệu lực"
              withAsterisk
              {...form.getInputProps("effectiveDate")}
            />
            <Textarea label="Lý do" withAsterisk rows={3} {...form.getInputProps("reason")} />
            <Textarea
              label="afterJson"
              withAsterisk
              rows={8}
              description={'TRANSFER: {"departmentId":"ou-sales"} | STATUS_CHANGE: {"employmentStatus":"ACTIVE"} | TERMINATION: {"employmentStatus":"TERMINATED"}'}
              {...form.getInputProps("afterJson")}
            />
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                Hủy
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <Modal
        opened={Boolean(selected)}
        title="Chi tiết điều chuyển"
        footer={null}
        width={680}
        onCancel={() => setSelected(null)}
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Steps
            current={selected ? movementStep(selected) : 0}
            status={selected?.status === "REJECTED" || selected?.status === "CANCELLED" ? "error" : "process"}
            items={[
              {
                title: "Nhân viên gửi",
                description: selected?.status === "DRAFT" ? "Đang soạn nháp" : "Đã ghi nhận yêu cầu",
              },
              {
                title: "Quản lý duyệt",
                description: selected?.status === "SUBMITTED" ? "Đang chờ xử lý" : selected?.status === "REJECTED" ? "Đã từ chối" : "Đã qua bước",
              },
              {
                title: "HR cập nhật",
                description: selected?.status === "APPROVED" ? "Đã sẵn sàng áp dụng" : "Chưa hoàn tất",
              },
            ]}
          />
          <Typography.Text type="secondary">
            Dữ liệu thay đổi sau duyệt
          </Typography.Text>
          <pre className="json-block">
            {JSON.stringify(selected?.afterJson ?? {}, null, 2)}
          </pre>
        </Space>
      </Modal>
    </>
  );
}
