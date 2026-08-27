import { useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Drawer,
  Group,
  Modal,
  Progress,
  Select,
  Stack,
  Table,
  Tabs,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  completeOffboardingInstance,
  createOffboardingInstance,
  updateOffboardingItem,
} from "../../features/offboarding/offboardingApi";
import type {
  OffboardingInstance,
  OffboardingInstancePayload,
  OffboardingTemplate,
} from "../../features/offboarding/offboardingTypes";
import type { WorkflowItem } from "../../features/onboarding/onboardingTypes";
import { useOffboarding } from "../../features/offboarding/useOffboarding";
import { mockEmployees } from "../../shared/mocks/mockEmployees";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingState } from "../../shared/components/LoadingState";
import { PageHeader } from "../../shared/components/PageHeader";
import { StatusTag } from "../../shared/components/StatusTag";
import { formatDate } from "../../shared/utils/date";
import { toast } from "../../shared/utils/toast";

export function OffboardingPage() {
  const queryClient = useQueryClient();
  const form = useForm<OffboardingInstancePayload>({
    initialValues: { employeeId: "", templateName: "", startDate: "" } as OffboardingInstancePayload,
    validate: {
      employeeId: (value: string) => (value ? null : "Chọn nhân viên."),
      templateName: (value: string) => (value ? null : "Chọn mẫu."),
      startDate: (value: string) => (value ? null : "Chọn ngày bắt đầu."),
    },
  });
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<OffboardingInstance | null>(null);
  const { data, isLoading, error, refetch } = useOffboarding({
    page: 1,
    pageSize: 50,
  });
  const offboardingQueryKey = ["offboarding", { page: 1, pageSize: 50 }] as const;

  function patchSelectedItem(itemId: string, status: string) {
    setSelected((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === itemId ? { ...item, status } : item,
            ),
          }
        : current,
    );
  }

  function patchOffboardingCache(itemId: string, status: string) {
    queryClient.setQueryData<{
      instances: OffboardingInstance[];
      templates: OffboardingTemplate[];
    }>(offboardingQueryKey, (current) =>
      current
        ? {
            ...current,
            instances: current.instances.map((instance) => ({
              ...instance,
              items: instance.items.map((item) =>
                item.id === itemId ? { ...item, status } : item,
              ),
            })),
          }
        : current,
    );
  }

  const createMutation = useMutation({
    mutationFn: createOffboardingInstance,
    onSuccess: async () => {
      toast.success("Đã tạo đợt offboarding.");
      setOpen(false);
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ["offboarding"] });
    },
  });

  const itemMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOffboardingItem(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["offboarding"] });
      const previousData = queryClient.getQueryData<{
        instances: OffboardingInstance[];
        templates: OffboardingTemplate[];
      }>(offboardingQueryKey);
      const previousSelected = selected;
      patchOffboardingCache(id, status);
      patchSelectedItem(id, status);
      return { previousData, previousSelected };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(offboardingQueryKey, context.previousData);
      }
      if (context?.previousSelected) {
        setSelected(context.previousSelected);
      }
      message.error("Không cập nhật được checklist offboarding.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["offboarding"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeOffboardingInstance,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["offboarding"] });
      setSelected(null);
    },
  });

  function progressPercent(instance: OffboardingInstance): number {
    if (!instance.items.length) return instance.status === "COMPLETED" ? 100 : 0;
    const completed = instance.items.filter((item) => item.status === "COMPLETED").length;
    return Math.round((completed / instance.items.length) * 100);
  }

  function toggleChecklistItem(item: WorkflowItem, checked: boolean) {
    itemMutation.mutate({ id: item.id, status: checked ? "COMPLETED" : "IN_PROGRESS" });
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader
        title="Offboarding"
        subtitle="Mẫu và đợt offboarding cho nhân viên."
        actions={
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setOpen(true)}
          >
            Tạo đợt
          </Button>
        }
      />
      <Tabs
        items={[
          {
            key: "instances",
            label: "Đợt",
            children: (
              <Card className="page-card">
                <Table
                  rowKey="id"
                  dataSource={data.instances}
                  pagination={false}
                  columns={[
                    { title: "Nhân viên", dataIndex: "employeeName" },
                    { title: "Mẫu", dataIndex: "templateName" },
                    {
                      title: "Ngày bắt đầu",
                      render: (_, record) => formatDate(record.startDate),
                    },
                    {
                      title: "Tiến độ",
                      width: 110,
                      render: (_, record) => (
                        <Progress type="circle" percent={progressPercent(record)} size={52} strokeColor="#f97316" />
                      ),
                    },
                    {
                      title: "Trạng thái",
                      render: (_, record) => (
                        <StatusTag status={record.status} />
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light" onClick={() => setSelected(record)}>
                          Xem danh sách kiểm tra
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="templates" pt="md">
          <Paper className="page-card" p="lg" radius="md">
            <Table.ScrollContainer minWidth={480}>
              <Table striped highlightOnHover fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Tên</Table.Th>
                    <Table.Th>Số lượng mục</Table.Th>
                    <Table.Th>Trạng thái</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.templates.map((record) => (
                    <Table.Tr key={record.id}>
                      <Table.Td>{record.name}</Table.Td>
                      <Table.Td>{record.itemCount}</Table.Td>
                      <Table.Td>
                        <StatusTag status={record.status} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <Drawer
        title="Tạo đợt offboarding"
        opened={open}
        position="right"
        size={420}
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
              label="Mẫu"
              withAsterisk
              data={data.templates.map((item) => item.name)}
              {...form.getInputProps("templateName")}
            />
            <Select
              label="Ngày bắt đầu"
              withAsterisk
              data={[
                { value: "2026-04-25", label: formatDate("2026-04-25") },
                { value: "2026-05-01", label: formatDate("2026-05-01") },
              ]}
              {...form.getInputProps("startDate")}
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
        title="Danh sách kiểm tra offboarding"
        size={760}
        onClose={() => setSelected(null)}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Table
            rowKey="id"
            dataSource={selected?.items ?? []}
            pagination={false}
            columns={[
              { title: "Mục", dataIndex: "title" },
              { title: "Phụ trách", dataIndex: "owner" },
              {
                title: "Checklist",
                render: (_, record) => (
                  <Space>
                    <Checkbox
                      checked={record.status === "COMPLETED"}
                      onChange={(event) => toggleChecklistItem(record, event.target.checked)}
                    />
                    <StatusTag status={record.status} />
                  </Space>
                ),
              },
            ]}
          />
          {selected && selected.status !== "COMPLETED" ? (
            <Group justify="flex-end">
              <Button
                loading={completeMutation.isPending}
                onClick={() => completeMutation.mutate(selected.id)}
              >
                Hoàn thành đợt
              </Button>
            </Group>
          ) : null}
        </Stack>
      </Modal>
    </>
  );
}
