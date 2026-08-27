import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconGitPullRequest,
  IconPlus,
  IconSend,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
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
import { useAllEmployees } from "../../features/employees/useEmployees";
import { useUnitsSelect } from "../../features/organization/useUnits";
import { useDepartmentsSelect } from "../../features/organization/useDepartments";
import { usePositionsSelect } from "../../features/organization/usePositions";
import {
  DataTable,
  type DataTableColumn,
} from "../../shared/components/DataTable";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { MOVEMENT_TYPE_OPTIONS } from "../../shared/constants/statuses";
import { formatDate } from "../../shared/utils/date";
import styles from "./MovementsPage.module.css";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  TRANSFER: "Chuyển đơn vị / Phòng ban (TRANSFER)",
  PROMOTION: "Bổ nhiệm / Thăng chức (PROMOTION)",
  STATUS_CHANGE: "Thay đổi trạng thái việc làm (STATUS_CHANGE)",
  TERMINATION: "Chấm dứt hợp đồng (TERMINATION)",
};

const STATUS_SELECT_OPTIONS = [
  { value: "DRAFT", label: "Nháp (DRAFT)" },
  { value: "SUBMITTED", label: "Đang trình duyệt (SUBMITTED)" },
  { value: "APPROVED", label: "Đã duyệt (APPROVED)" },
  { value: "REJECTED", label: "Từ chối (REJECTED)" },
  { value: "CANCELLED", label: "Đã hủy (CANCELLED)" },
];

function parseAfterJson(afterJson?: Record<string, unknown> | null) {
  if (!afterJson) return {};
  return typeof afterJson === "string" ? JSON.parse(afterJson) : afterJson;
}

export function MovementsPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();

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

  // Danh mục nhân sự và tổ chức
  const allEmployeesQuery = useAllEmployees({});
  const unitsQuery = useUnitsSelect();
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(
    undefined,
  );
  const departmentsQuery = useDepartmentsSelect(selectedUnitId);
  const positionsQuery = usePositionsSelect();

  const employeeOptions = useMemo(
    () =>
      (allEmployeesQuery.data ?? []).map((emp) => ({
        value: emp.id,
        label: `${emp.fullName} (${emp.employeeCode})`,
      })),
    [allEmployeesQuery.data],
  );

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data ?? []).map((u) => ({
        value: u.id,
        label: `${u.name} (${u.code})`,
      })),
    [unitsQuery.data],
  );

  const departmentOptions = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((d) => ({
        value: d.id,
        label: `${d.name} (${d.code})`,
      })),
    [departmentsQuery.data],
  );

  const positionOptions = useMemo(
    () =>
      (positionsQuery.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.name} (${p.code})`,
      })),
    [positionsQuery.data],
  );

  // Form tạo điều chuyển
  const form = useForm({
    initialValues: {
      employeeId: "",
      movementType: "TRANSFER",
      effectiveDate: new Date().toISOString().slice(0, 10),
      reason: "",
      unitId: "",
      departmentId: "",
      positionId: "",
      employmentStatus: "ACTIVE",
    },
    validate: {
      employeeId: (val) => (val ? null : "Vui lòng chọn nhân viên"),
      movementType: (val) => (val ? null : "Vui lòng chọn loại điều chuyển"),
      effectiveDate: (val) => (val ? null : "Vui lòng chọn ngày hiệu lực"),
      reason: (val) => (val?.trim() ? null : "Vui lòng nhập lý do điều chuyển"),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const targetPayload: Record<string, unknown> = {};
      if (values.unitId) targetPayload.unitId = values.unitId;
      if (values.departmentId) targetPayload.departmentId = values.departmentId;
      if (values.positionId) targetPayload.positionId = values.positionId;
      if (values.employmentStatus) targetPayload.employmentStatus = values.employmentStatus;

      const payload: MovementPayload = {
        employeeId: values.employeeId,
        movementType: values.movementType,
        effectiveDate: values.effectiveDate,
        reason: values.reason.trim(),
        afterJson: JSON.stringify(targetPayload),
      };
      return createMovement(payload);
    },
    onSuccess: async () => {
      notifications.show({
        color: "green",
        title: "Tạo điều chuyển thành công",
        message: "Quyết định điều chuyển đã được tạo ở trạng thái Nháp.",
      });
      setOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["movements"] });
    },
    onError: () => {
      notifications.show({
        color: "red",
        title: "Không tạo được điều chuyển",
        message: "Vui lòng kiểm tra lại dữ liệu và thử lại.",
      });
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
    onSuccess: async (_, variables) => {
      const actionLabels = {
        submit: "Đã gửi trình duyệt quyết định điều chuyển.",
        approve: "Đã duyệt quyết định điều chuyển.",
        reject: "Đã từ chối quyết định điều chuyển.",
        cancel: "Đã hủy quyết định điều chuyển.",
      };
      notifications.show({
        color: variables.action === "reject" ? "red" : "green",
        title: "Cập nhật thành công",
        message: actionLabels[variables.action],
      });
      if (selected?.id === variables.id) {
        setSelected(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["movements"] });
    },
    onError: () => {
      notifications.show({
        color: "red",
        title: "Thao tác thất bại",
        message: "Không thể thay đổi trạng thái điều chuyển. Vui lòng thử lại.",
      });
    },
  });

  const columns = useMemo<DataTableColumn<Movement>[]>(
    () => [
      {
        key: "employeeName",
        header: "NHÂN VIÊN",
        render: (record) => (
          <Text size="sm" fw={500}>
            {record.employeeName}
          </Text>
        ),
      },
      {
        key: "movementType",
        header: "LOẠI",
        render: (record) => (
          <Text size="sm">
            {record.movementType}
          </Text>
        ),
      },
      {
        key: "effectiveDate",
        header: "NGÀY HIỆU LỰC",
        render: (record) => formatDate(record.effectiveDate),
      },
      {
        key: "reason",
        header: "LÝ DO",
        minWidth: 220,
        render: (record) => (
          <Text size="sm" lineClamp={1}>
            {record.reason || "-"}
          </Text>
        ),
      },
      {
        key: "status",
        header: "TRẠNG THÁI",
        width: 150,
        align: "center",
        render: (record) => <StatusTag status={record.status} />,
      },
      {
        key: "actions",
        header: "THAO TÁC",
        width: 110,
        align: "right",
        render: (record) => (
          <Button
            size="xs"
            variant="light"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(record);
            }}
          >
            Chi tiết
          </Button>
        ),
      },
    ],
    [can, statusMutation],
  );

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title="Điều chuyển"
        subtitle="Quy trình điều chuyển với các trạng thái gửi duyệt, duyệt, từ chối và hủy."
        actions={
          can(HR_PERMISSIONS.MOVEMENT_CREATE) ? (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setOpen(true)}
            >
              Tạo mới
            </Button>
          ) : undefined
        }
      />

      <div className={styles.container}>
        {/* Filter Panel */}
        <div className={styles.filterPanel}>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <Select
              clearable
              placeholder="Nhân viên"
              aria-label="Lọc theo nhân viên"
              searchable
              data={employeeOptions}
              value={params.employeeId ?? null}
              onChange={(value) =>
                setParams((current) => ({
                  ...current,
                  page: 1,
                  employeeId: value ?? undefined,
                }))
              }
            />

            <Select
              clearable
              placeholder="Loại điều chuyển"
              aria-label="Lọc theo loại điều chuyển"
              data={[...MOVEMENT_TYPE_OPTIONS]}
              value={params.movementType ?? null}
              onChange={(value) =>
                setParams((current) => ({
                  ...current,
                  page: 1,
                  movementType: value ?? undefined,
                }))
              }
            />

            <Select
              clearable
              placeholder="Trạng thái"
              aria-label="Lọc theo trạng thái"
              data={STATUS_SELECT_OPTIONS}
              value={params.status ?? null}
              onChange={(value) =>
                setParams((current) => ({
                  ...current,
                  page: 1,
                  status: value ?? undefined,
                }))
              }
            />
          </SimpleGrid>
        </div>

        {/* Bảng dữ liệu */}
        <DataTable
          data={data.items}
          columns={columns}
          rowKey={(record) => record.id}
          meta={data.pagination}
          onRowClick={(record) => setSelected(record)}
          onPageChange={(page, pageSize) =>
            setParams((current) => ({ ...current, page, pageSize }))
          }
          emptyTitle="Chưa có điều chuyển"
          emptyDescription="Không có bản ghi điều chuyển phù hợp với bộ lọc hiện tại."
        />
      </div>

      {/* Drawer: Tạo mới */}
      <Drawer
        title={
          <Group gap={8}>
            <IconGitPullRequest size={20} color="#0068ff" />
            <Text fw={700} size="md">Tạo điều chuyển</Text>
          </Group>
        }
        opened={open}
        position="right"
        size="lg"
        onClose={() => {
          setOpen(false);
          form.reset();
        }}
      >
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack gap="md">
            <Select
              label="Nhân viên"
              placeholder="Chọn nhân viên"
              withAsterisk
              searchable
              data={employeeOptions}
              disabled={allEmployeesQuery.isLoading}
              {...form.getInputProps("employeeId")}
            />

            <Select
              label="Loại điều chuyển"
              placeholder="Chọn loại điều chuyển"
              withAsterisk
              data={Object.entries(MOVEMENT_TYPE_LABELS).map(([val, label]) => ({
                value: val,
                label,
              }))}
              {...form.getInputProps("movementType")}
            />

            <TextInput
              label="Ngày hiệu lực"
              type="date"
              withAsterisk
              {...form.getInputProps("effectiveDate")}
            />

            <Text fw={600} size="sm" c="dimmed" mt={4}>
              Cấu hình phân công mới:
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label="Đơn vị đích"
                placeholder="Chọn đơn vị"
                clearable
                searchable
                data={unitOptions}
                disabled={unitsQuery.isLoading}
                value={form.values.unitId || null}
                onChange={(val) => {
                  form.setFieldValue("unitId", val ?? "");
                  form.setFieldValue("departmentId", "");
                  setSelectedUnitId(val ?? undefined);
                }}
              />

              <Select
                label="Phòng ban đích"
                placeholder="Chọn phòng ban"
                clearable
                searchable
                data={departmentOptions}
                disabled={departmentsQuery.isLoading}
                value={form.values.departmentId || null}
                onChange={(val) => form.setFieldValue("departmentId", val ?? "")}
              />
            </SimpleGrid>

            <Select
              label="Chức danh / Vị trí đích"
              placeholder="Chọn chức vụ mới"
              clearable
              searchable
              data={positionOptions}
              disabled={positionsQuery.isLoading}
              value={form.values.positionId || null}
              onChange={(val) => form.setFieldValue("positionId", val ?? "")}
            />

            <Textarea
              label="Lý do"
              placeholder="Nhập lý do điều chuyển..."
              withAsterisk
              rows={3}
              {...form.getInputProps("reason")}
            />

            <Group justify="flex-end" gap="sm" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending}
                leftSection={<IconCheck size={16} />}
              >
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      {/* Modal: Chi tiết điều chuyển */}
      <Modal
        opened={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={
          <Group gap={8}>
            <IconUserCheck size={20} color="#0068ff" />
            <Text fw={700} size="md">Chi tiết điều chuyển</Text>
          </Group>
        }
        size="lg"
        radius="md"
      >
        {selected && (
          <div className={styles.detailContainer}>
            {/* Thông tin so sánh */}
            <div className={styles.comparisonGrid}>
              <div className={styles.comparisonBox}>
                <div className={styles.comparisonBoxHeader}>Thông tin nhân sự</div>
                <div className={styles.comparisonItem}>
                  <span className={styles.comparisonItemLabel}>Họ và tên:</span>
                  <span className={styles.comparisonItemValue}>{selected.employeeName}</span>
                </div>
                <div className={styles.comparisonItem}>
                  <span className={styles.comparisonItemLabel}>Mã nhân sự:</span>
                  <span className={styles.comparisonItemValue}>{selected.employeeId}</span>
                </div>
                <div className={styles.comparisonItem}>
                  <span className={styles.comparisonItemLabel}>Loại quyết định:</span>
                  <span className={styles.comparisonItemValue}>{selected.movementType}</span>
                </div>
              </div>

              <div className={styles.comparisonBox}>
                <div className={styles.comparisonBoxHeader}>Đích đến sau điều chuyển</div>
                <div className={styles.comparisonItem}>
                  <span className={styles.comparisonItemLabel}>Ngày hiệu lực:</span>
                  <span className={styles.comparisonItemValue}>
                    {formatDate(selected.effectiveDate)}
                  </span>
                </div>
                <div className={styles.comparisonItem}>
                  <span className={styles.comparisonItemLabel}>Thông số phân công mới:</span>
                  <pre
                    style={{
                      margin: 0,
                      fontSize: 11,
                      background: "transparent",
                      color: "inherit",
                    }}
                  >
                    {JSON.stringify(parseAfterJson(selected.afterJson), null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className={styles.comparisonBox}>
              <div className={styles.comparisonBoxHeader}>Lý do điều chuyển</div>
              <Text size="sm">{selected.reason || "Không có ghi chú thêm."}</Text>
            </div>

            {/* Actions footer in Modal */}
            <Group justify="flex-end" gap="sm" mt="sm">
              {selected.status === "DRAFT" && can(HR_PERMISSIONS.MOVEMENT_SUBMIT) && (
                <Button
                  leftSection={<IconSend size={14} />}
                  onClick={() =>
                    statusMutation.mutate({ id: selected.id, action: "submit" })
                  }
                  loading={statusMutation.isPending}
                >
                  Gửi duyệt
                </Button>
              )}

              {selected.status === "SUBMITTED" && can(HR_PERMISSIONS.MOVEMENT_APPROVE) && (
                <Button
                  color="green"
                  leftSection={<IconCheck size={14} />}
                  onClick={() =>
                    statusMutation.mutate({ id: selected.id, action: "approve" })
                  }
                  loading={statusMutation.isPending}
                >
                  Duyệt
                </Button>
              )}

              {selected.status === "SUBMITTED" && can(HR_PERMISSIONS.MOVEMENT_REJECT) && (
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconX size={14} />}
                  onClick={() =>
                    statusMutation.mutate({ id: selected.id, action: "reject" })
                  }
                  loading={statusMutation.isPending}
                >
                  Từ chối
                </Button>
              )}

              {["DRAFT", "SUBMITTED"].includes(selected.status) &&
                can(HR_PERMISSIONS.MOVEMENT_CANCEL) && (
                  <Button
                    variant="default"
                    onClick={() =>
                      statusMutation.mutate({ id: selected.id, action: "cancel" })
                    }
                    loading={statusMutation.isPending}
                  >
                    Hủy
                  </Button>
                )}

              <Button variant="default" onClick={() => setSelected(null)}>
                Đóng
              </Button>
            </Group>
          </div>
        )}
      </Modal>
    </>
  );
}
