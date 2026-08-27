import { useState } from "react";
import {
  Button,
  Drawer,
  Group,
  Modal,
  Paper,
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
} from "../../features/offboarding/offboardingTypes";
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
      <Tabs defaultValue="instances">
        <Tabs.List>
          <Tabs.Tab value="instances">Đợt</Tabs.Tab>
          <Tabs.Tab value="templates">Mẫu</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="instances" pt="md">
          <Paper className="page-card" p="lg" radius="md">
            <Table.ScrollContainer minWidth={760}>
              <Table striped highlightOnHover fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nhân viên</Table.Th>
                    <Table.Th>Mẫu</Table.Th>
                    <Table.Th>Ngày bắt đầu</Table.Th>
                    <Table.Th>Trạng thái</Table.Th>
                    <Table.Th>Thao tác</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.instances.map((record) => (
                    <Table.Tr key={record.id}>
                      <Table.Td>{record.employeeName}</Table.Td>
                      <Table.Td>{record.templateName}</Table.Td>
                      <Table.Td>{formatDate(record.startDate)}</Table.Td>
                      <Table.Td>
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
        <Stack gap="md">
          <Table.ScrollContainer minWidth={640}>
            <Table striped highlightOnHover fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Mục</Table.Th>
                  <Table.Th>Phụ trách</Table.Th>
                  <Table.Th>Trạng thái</Table.Th>
                  <Table.Th>Thao tác</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(selected?.items ?? []).map((record) => (
                  <Table.Tr key={record.id}>
                    <Table.Td>{record.title}</Table.Td>
                    <Table.Td>{record.owner}</Table.Td>
                    <Table.Td>
                      <StatusTag status={record.status} />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        w={150}
                        aria-label="Đổi trạng thái mục"
                        value={record.status}
                        data={["DRAFT", "IN_PROGRESS", "COMPLETED"]}
                        allowDeselect={false}
                        onChange={(value) =>
                          value && itemMutation.mutate({ id: record.id, status: value })
                        }
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
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
