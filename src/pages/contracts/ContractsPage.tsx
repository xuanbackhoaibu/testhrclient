import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconFileText, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { createContract, terminateContract } from "../../features/contracts/contractsApi";
import type { Contract, ContractPayload } from "../../features/contracts/contractTypes";
import { useContracts } from "../../features/contracts/useContracts";
import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { NormalizedSearchInput } from "../../shared/components/NormalizedSearchInput";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { TableActionsMenu, type TableActionItem } from "../../shared/components/TableActionsMenu";
import { CONTRACT_TYPE_OPTIONS } from "../../shared/constants/statuses";
import { mockEmployees } from "../../shared/mocks/mockEmployees";
import { formatDate } from "../../shared/utils/date";

const CONTRACT_STATUS_OPTIONS = ["ACTIVE", "COMPLETED", "TERMINATED"];
const CONTRACT_TYPE_LABELS: Record<string, string> = {
  LABOR: "Hợp đồng lao động",
  PROBATION: "Hợp đồng thử việc",
  CONSULTING: "Hợp đồng tư vấn",
};

/** Hợp đồng còn dưới 30 ngày là sắp hết hạn, cần cảnh báo trên UI. */
const EXPIRY_WARNING_DAYS = 30;

function getExpiryTone(contract: Contract): "danger" | "warning" | null {
  if (!contract.endDate || contract.status === "TERMINATED") return null;
  const daysLeft = dayjs(contract.endDate).diff(dayjs(), "day");
  if (daysLeft < 0) return "danger";
  if (daysLeft <= EXPIRY_WARNING_DAYS) return "warning";
  return null;
}

export function ContractsPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [opened, setOpened] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState<Contract | null>(null);
  const [search, setSearch] = useState("");
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = useContracts({ ...params, search });

  const form = useForm<ContractPayload>({
    initialValues: {
      employeeId: "",
      contractNo: "",
      contractType: "",
      startDate: "",
      endDate: "",
      status: "ACTIVE",
    },
    validate: {
      employeeId: (value) => (value ? null : "Vui lòng chọn nhân viên"),
      contractNo: (value) => (value.trim() ? null : "Vui lòng nhập số hợp đồng"),
      contractType: (value) => (value ? null : "Vui lòng chọn loại hợp đồng"),
      startDate: (value) => (value ? null : "Vui lòng chọn ngày bắt đầu"),
    },
  });

  const terminateForm = useForm<{ endDate: string }>({
    initialValues: { endDate: "" },
    validate: { endDate: (value) => (value ? null : "Vui lòng chọn ngày kết thúc") },
  });

  const createMutation = useMutation({
    mutationFn: createContract,
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Đã tạo hợp đồng." });
      setOpened(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: () => notifications.show({ color: "red", message: "Không tạo được hợp đồng." }),
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) => terminateContract(id, { endDate }),
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Đã kết thúc hợp đồng." });
      setTerminateTarget(null);
      terminateForm.reset();
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: () => notifications.show({ color: "red", message: "Không kết thúc được hợp đồng." }),
  });

  const employeeOptions = useMemo(
    () => mockEmployees.map((item) => ({ value: item.id, label: `${item.fullName} (${item.employeeCode})` })),
    [],
  );

  const columns: DataTableColumn<Contract>[] = [
    { key: "employeeName", header: "Nhân viên", render: (record) => record.employeeName },
    { key: "contractNo", header: "Số hợp đồng", render: (record) => record.contractNo },
    {
      key: "contractType",
      header: "Loại hợp đồng",
      render: (record) => CONTRACT_TYPE_LABELS[record.contractType] ?? record.contractType,
    },
    {
      key: "range",
      header: "Hiệu lực",
      render: (record) => {
        const tone = getExpiryTone(record);
        return (
          <Group gap={6} wrap="nowrap">
            <Text size="sm">
              {formatDate(record.startDate)} → {record.endDate ? formatDate(record.endDate) : "Không xác định"}
            </Text>
            {tone === "danger" ? (
              <Badge color="red" variant="light" leftSection={<IconAlertTriangle size={12} />}>
                Đã hết hạn
              </Badge>
            ) : null}
            {tone === "warning" ? (
              <Badge color="orange" variant="light" leftSection={<IconAlertTriangle size={12} />}>
                Sắp hết hạn
              </Badge>
            ) : null}
          </Group>
        );
      },
    },
    { key: "status", header: "Trạng thái", render: (record) => <StatusTag status={record.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      width: 90,
      render: (record) => {
        const actions: TableActionItem[] = [];
        if (record.status !== "TERMINATED" && can(HR_PERMISSIONS.CONTRACT_TERMINATE)) {
          actions.push({ label: "Kết thúc hợp đồng", color: "red", onClick: () => setTerminateTarget(record) });
        }
        return <TableActionsMenu actions={actions} />;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Hợp đồng"
        subtitle="Quản lý hợp đồng lao động và cảnh báo hợp đồng sắp/đã hết hạn."
        actions={
          can(HR_PERMISSIONS.CONTRACT_CREATE) ? (
            <Button leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
              Tạo hợp đồng
            </Button>
          ) : undefined
        }
      />

      <Paper p="md" radius="lg" withBorder mb="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <NormalizedSearchInput
            label="Tìm kiếm"
            placeholder="Tên nhân viên, số hợp đồng..."
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
            label="Trạng thái"
            placeholder="Tất cả"
            clearable
            data={CONTRACT_STATUS_OPTIONS.map((item) => ({ value: item, label: item }))}
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
        emptyTitle="Chưa có hợp đồng"
        emptyDescription="Không có hợp đồng nào khớp với bộ lọc hiện tại."
      />

      <Drawer
        opened={opened}
        onClose={() => {
          setOpened(false);
          form.reset();
        }}
        title="Tạo hợp đồng"
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
            <TextInput
              label="Số hợp đồng"
              placeholder="VD: HD-2026-001"
              required
              {...form.getInputProps("contractNo")}
            />
            <Group grow>
              <Select
                label="Loại hợp đồng"
                placeholder="Chọn loại"
                required
                data={CONTRACT_TYPE_OPTIONS.map((item) => ({ value: item, label: CONTRACT_TYPE_LABELS[item] ?? item }))}
                {...form.getInputProps("contractType")}
              />
              <Select
                label="Trạng thái"
                required
                data={["ACTIVE", "COMPLETED"].map((item) => ({ value: item, label: item }))}
                {...form.getInputProps("status")}
              />
            </Group>
            <Group grow>
              <TextInput
                label="Ngày bắt đầu"
                type="date"
                required
                {...form.getInputProps("startDate")}
              />
              <TextInput
                label="Ngày kết thúc (nếu có)"
                type="date"
                {...form.getInputProps("endDate")}
              />
            </Group>
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setOpened(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={createMutation.isPending} leftSection={<IconFileText size={16} />}>
                Lưu hợp đồng
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <Modal
        opened={Boolean(terminateTarget)}
        onClose={() => setTerminateTarget(null)}
        title="Kết thúc hợp đồng"
        centered
      >
        <form
          onSubmit={terminateForm.onSubmit((values) => {
            if (terminateTarget) {
              terminateMutation.mutate({ id: terminateTarget.id, endDate: values.endDate });
            }
          })}
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Kết thúc hợp đồng {terminateTarget?.contractNo} của {terminateTarget?.employeeName}.
            </Text>
            <TextInput
              label="Ngày kết thúc"
              type="date"
              required
              {...terminateForm.getInputProps("endDate")}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setTerminateTarget(null)} disabled={terminateMutation.isPending}>
                Hủy
              </Button>
              <Button type="submit" color="red" loading={terminateMutation.isPending}>
                Xác nhận kết thúc
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
