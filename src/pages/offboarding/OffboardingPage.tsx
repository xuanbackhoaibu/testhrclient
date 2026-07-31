import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  Group,
  Modal,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconChecklist, IconPlus, IconTemplate, IconUserPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { HR_PERMISSIONS } from "../../features/auth/permissions";
import { useAuth } from "../../features/auth/useAuth";
import {
  completeOffboardingInstance,
  createOffboardingInstance,
  updateOffboardingItem,
} from "../../features/offboarding/offboardingApi";
import type {
  OffboardingInstance,
  OffboardingInstancePayload,
} from "../../features/offboarding/offboardingTypes";
import { useOffboarding } from "../../features/offboarding/useOffboarding";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { EmptyState } from "../../shared/components/EmptyState";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { mockEmployees } from "../../shared/mocks/mockEmployees";
import { formatDate } from "../../shared/utils/date";

const ITEM_STATUS_OPTIONS = ["DRAFT", "IN_PROGRESS", "COMPLETED"];

function completionRate(instance: OffboardingInstance) {
  if (!instance.items.length) return 0;
  const done = instance.items.filter((item) => item.status === "COMPLETED").length;
  return Math.round((done / instance.items.length) * 100);
}

export function OffboardingPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<OffboardingInstance | null>(null);
  const { data, isLoading, error, refetch } = useOffboarding({ page: 1, pageSize: 50 });

  const form = useForm<OffboardingInstancePayload>({
    initialValues: { employeeId: "", templateName: "", startDate: "" },
    validate: {
      employeeId: (value) => (value ? null : "Vui lòng chọn nhân viên"),
      templateName: (value) => (value ? null : "Vui lòng chọn mẫu offboarding"),
      startDate: (value) => (value ? null : "Vui lòng chọn ngày bắt đầu"),
    },
  });

  const createMutation = useMutation({
    mutationFn: createOffboardingInstance,
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Đã tạo đợt offboarding." });
      setOpened(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["offboarding"] });
    },
    onError: () => notifications.show({ color: "red", message: "Không tạo được đợt offboarding." }),
  });

  const itemMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateOffboardingItem(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["offboarding"] });
    },
    onError: () => notifications.show({ color: "red", message: "Không cập nhật được mục checklist." }),
  });

  const completeMutation = useMutation({
    mutationFn: completeOffboardingInstance,
    onSuccess: async () => {
      notifications.show({ color: "green", message: "Đã hoàn thành đợt offboarding." });
      await queryClient.invalidateQueries({ queryKey: ["offboarding"] });
      setSelected(null);
    },
    onError: () => notifications.show({ color: "red", message: "Không hoàn thành được đợt offboarding." }),
  });

  const employeeOptions = useMemo(
    () => mockEmployees.map((item) => ({ value: item.id, label: `${item.fullName} (${item.employeeCode})` })),
    [],
  );

  const instanceColumns: DataTableColumn<OffboardingInstance>[] = [
    { key: "employeeName", header: "Nhân viên", render: (record) => record.employeeName },
    { key: "templateName", header: "Mẫu áp dụng", render: (record) => record.templateName },
    { key: "startDate", header: "Ngày bắt đầu", render: (record) => formatDate(record.startDate) },
    {
      key: "progress",
      header: "Tiến độ",
      minWidth: 160,
      render: (record) => (
        <Stack gap={4}>
          <Progress value={completionRate(record)} size={7} radius="xl" color={completionRate(record) === 100 ? "green" : "blue"} />
          <Text size="xs" c="dimmed">
            {record.items.filter((item) => item.status === "COMPLETED").length}/{record.items.length} mục • {completionRate(record)}%
          </Text>
        </Stack>
      ),
    },
    { key: "status", header: "Trạng thái", render: (record) => <StatusTag status={record.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      width: 160,
      render: (record) => (
        <Button size="xs" variant="light" leftSection={<IconChecklist size={14} />} onClick={() => setSelected(record)}>
          Xem checklist
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Offboarding"
        subtitle="Theo dõi mẫu và các đợt offboarding cho nhân viên nghỉ việc."
        actions={
          can(HR_PERMISSIONS.OFFBOARDING_MANAGE) ? (
            <Button leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
              Tạo đợt offboarding
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="instances" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="instances" leftSection={<IconUserPlus size={16} />}>
            Đợt offboarding
          </Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
            Mẫu offboarding
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="instances">
          <DataTable
            data={data?.instances ?? []}
            columns={instanceColumns}
            rowKey={(record) => record.id}
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            emptyTitle="Chưa có đợt offboarding"
            emptyDescription="Tạo đợt offboarding đầu tiên cho nhân viên mới."
          />
        </Tabs.Panel>

        <Tabs.Panel value="templates">
          {isLoading ? null : !data?.templates.length ? (
            <EmptyState title="Chưa có mẫu offboarding" description="Chưa có mẫu checklist offboarding nào được cấu hình." />
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {data.templates.map((template) => (
                <Paper key={template.id} p="lg" radius="lg" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <Text fw={700}>{template.name}</Text>
                      <StatusTag status={template.status} />
                    </Group>
                    <Badge variant="light" color="blue" w="fit-content">
                      {template.itemCount} mục checklist
                    </Badge>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>

      <Drawer
        opened={opened}
        onClose={() => {
          setOpened(false);
          form.reset();
        }}
        title="Tạo đợt offboarding"
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
              label="Mẫu offboarding"
              placeholder="Chọn mẫu"
              required
              data={(data?.templates ?? []).map((item) => ({ value: item.name, label: item.name }))}
              {...form.getInputProps("templateName")}
            />
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
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setOpened(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <Modal opened={Boolean(selected)} onClose={() => setSelected(null)} title="Checklist offboarding" size="lg">
        {selected ? (
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text fw={700}>{selected.employeeName}</Text>
                <Text size="sm" c="dimmed">
                  {selected.templateName} • Bắt đầu {formatDate(selected.startDate)}
                </Text>
              </div>
              <StatusTag status={selected.status} />
            </Group>
            <Progress value={completionRate(selected)} size={8} radius="xl" />
            <Stack gap="xs">
              {selected.items.map((item) => (
                <Paper key={item.id} p="sm" radius="md" withBorder>
                  <Group justify="space-between" wrap="wrap" gap="sm">
                    <div>
                      <Text size="sm" fw={600}>
                        {item.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Phụ trách: {item.owner}
                      </Text>
                    </div>
                    <Select
                      size="xs"
                      w={170}
                      value={item.status}
                      data={ITEM_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
                      onChange={(value) => value && itemMutation.mutate({ id: item.id, status: value })}
                      allowDeselect={false}
                    />
                  </Group>
                </Paper>
              ))}
            </Stack>
            {selected.status !== "COMPLETED" ? (
              <Group justify="flex-end">
                <Button loading={completeMutation.isPending} onClick={() => completeMutation.mutate(selected.id)}>
                  Hoàn thành đợt offboarding
                </Button>
              </Group>
            ) : null}
          </Stack>
        ) : null}
      </Modal>
    </>
  );
}
