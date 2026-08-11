import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Drawer, Group, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconPlus } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { createContract, terminateContract } from '../../features/contracts/contractsApi';
import type { Contract, ContractPayload } from '../../features/contracts/contractTypes';
import { useContracts } from '../../features/contracts/useContracts';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { CONTRACT_TYPE_OPTIONS } from '../../shared/constants/statuses';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate } from '../../shared/utils/date';
import { BaseModal, BaseTable } from '../../shared/ui';
import { focusFirstFormError, zodMantineValidate } from '../../shared/forms/zodMantine';

const contractSchema = z.object({
  employeeId: z.string().min(1, 'Chọn nhân sự.'),
  contractNo: z.string().trim().min(1, 'Nhập số hợp đồng.'),
  contractType: z.string().min(1, 'Chọn loại hợp đồng.'),
  startDate: z.string().min(1, 'Chọn ngày bắt đầu.'),
  endDate: z.string(),
  status: z.string().min(1, 'Chọn trạng thái.'),
}).refine(
  (values) => !values.endDate || !values.startDate || values.endDate >= values.startDate,
  { path: ['endDate'], message: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.' },
) satisfies z.ZodType<ContractPayload>;

const terminateSchema = z.object({
  endDate: z.string().min(1, 'Chọn ngày kết thúc.'),
});

const emptyContractValues: ContractPayload = {
  employeeId: '',
  contractNo: '',
  contractType: '',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
};

function daysUntil(date?: string): number | null {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function ContractExpiryBadge({ record }: { record: Contract }) {
  if (record.status === 'TERMINATED') {
    return <Badge color="gray" variant="light">Đã kết thúc</Badge>;
  }
  const days = daysUntil(record.endDate);
  if (days === null) {
    return <Badge color="blue" variant="light">Không thời hạn</Badge>;
  }
  if (days < 0) {
    return <Badge color="red" variant="filled" className="contract-expiry-critical">Quá hạn {Math.abs(days)} ngày</Badge>;
  }
  if (days <= 15) {
    return <Badge color="red" variant="filled" className="contract-expiry-critical">Còn {days} ngày</Badge>;
  }
  if (days <= 30) {
    return <Badge color="yellow" variant="light">Còn {days} ngày</Badge>;
  }
  return <Badge color="green" variant="light">Còn hiệu lực dài</Badge>;
}

export function ContractsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [terminateId, setTerminateId] = useState<string | null>(null);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = useContracts(params);

  const form = useForm<ContractPayload>({
    initialValues: emptyContractValues,
    validate: zodMantineValidate(contractSchema),
    validateInputOnChange: true,
  });
  const terminateForm = useForm<{ endDate: string }>({
    initialValues: { endDate: '' },
    validate: zodMantineValidate(terminateSchema),
    validateInputOnChange: true,
  });

  const employeeOptions = mockEmployees.map((item) => ({ value: item.id, label: item.fullName }));
  const statusOptions = ['ACTIVE', 'COMPLETED', 'TERMINATED'].map((item) => ({ value: item, label: item }));
  const expiringNextWeek = useMemo(
    () => (data?.items ?? []).filter((item) => {
      const days = daysUntil(item.endDate);
      return item.status === 'ACTIVE' && days !== null && days >= 0 && days <= 7;
    }),
    [data?.items],
  );

  const createMutation = useMutation({
    mutationFn: createContract,
    onSuccess: async () => {
      notifications.show({ color: 'green', title: 'Đã tạo hợp đồng', message: 'Hợp đồng mới đã được lưu.' });
      setOpen(false);
      form.setValues(emptyContractValues);
      form.resetDirty(emptyContractValues);
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) => terminateContract(id, { endDate }),
    onSuccess: async () => {
      notifications.show({ color: 'green', title: 'Đã kết thúc hợp đồng', message: 'Trạng thái hợp đồng đã được cập nhật.' });
      setTerminateId(null);
      terminateForm.setValues({ endDate: '' });
      terminateForm.resetDirty({ endDate: '' });
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  function closeDrawer() {
    setOpen(false);
    form.setValues(emptyContractValues);
    form.resetDirty(emptyContractValues);
  }

  function handleInvalid(errors: typeof form.errors) {
    focusFirstFormError(errors);
    notifications.show({
      color: 'red',
      title: 'Cần kiểm tra lại hợp đồng',
      message: 'Một số trường bắt buộc hoặc mốc thời gian chưa hợp lệ.',
    });
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
        title="Contracts"
        subtitle="Contract metadata demo cho HRM phase 1."
        actions={<Button leftSection={<IconPlus size={16} />} onClick={() => setOpen(true)}>Create</Button>}
      />
      <Card className="page-card">
        <Stack gap="md">
          {expiringNextWeek.length > 0 ? (
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
              <Group justify="space-between" gap="sm">
                <Text fw={700}>
                  Có {expiringNextWeek.length} hợp đồng kết thúc trong 7 ngày tới.
                </Text>
                <Button size="xs" color="red" variant="light" onClick={() => setParams((current) => ({ ...current, status: 'ACTIVE', page: 1 }))}>
                  Đánh giá ngay
                </Button>
              </Group>
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            <Select
              clearable
              searchable
              placeholder="Employee"
              data={employeeOptions}
              value={params.employeeId ?? null}
              onChange={(value) => setParams((current) => ({ ...current, page: 1, employeeId: value ?? undefined }))}
            />
            <Select
              clearable
              placeholder="Status"
              data={statusOptions}
              value={params.status ?? null}
              onChange={(value) => setParams((current) => ({ ...current, page: 1, status: value ?? undefined }))}
            />
          </SimpleGrid>

          <BaseTable
            rowKey="id"
            dataSource={data.items}
            pagination={{
              current: data.pagination.page,
              pageSize: data.pagination.pageSize,
              total: data.pagination.total,
              onChange: (page, pageSize) => setParams((current) => ({ ...current, page, pageSize })),
            }}
            columns={[
              { title: 'Employee', dataIndex: 'employeeName' },
              { title: 'Contract no', dataIndex: 'contractNo' },
              { title: 'Type', dataIndex: 'contractType' },
              { title: 'Start date', render: (_, record) => formatDate(record.startDate) },
              { title: 'End date', render: (_, record) => formatDate(record.endDate) },
              { title: 'Tình trạng', render: (_, record) => <ContractExpiryBadge record={record} /> },
              { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
              {
                title: 'Actions',
                render: (_, record) => (
                  record.status !== 'TERMINATED' ? <Button variant="default" size="xs" onClick={() => setTerminateId(record.id)}>Terminate</Button> : null
                ),
              },
            ]}
          />
        </Stack>
      </Card>

      <Drawer
        title="Create contract"
        opened={open}
        size={460}
        position="right"
        onClose={closeDrawer}
      >
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values), handleInvalid)}>
          <Stack gap="sm">
            <Select label="Employee" data={employeeOptions} searchable {...form.getInputProps('employeeId')} />
            <TextInput label="Contract no" {...form.getInputProps('contractNo')} />
            <Select label="Contract type" data={CONTRACT_TYPE_OPTIONS.map((item) => ({ value: item, label: item }))} {...form.getInputProps('contractType')} />
            <TextInput label="Start date" type="date" {...form.getInputProps('startDate')} />
            <TextInput label="End date" type="date" {...form.getInputProps('endDate')} />
            <Select label="Status" data={['ACTIVE', 'COMPLETED'].map((item) => ({ value: item, label: item }))} {...form.getInputProps('status')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeDrawer}>Cancel</Button>
              <Button type="submit" loading={createMutation.isPending}>Save</Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <BaseModal
        opened={Boolean(terminateId)}
        title="Terminate contract"
        onClose={() => setTerminateId(null)}
      >
        <form
          onSubmit={terminateForm.onSubmit(
            (values) => {
              if (terminateId) {
                terminateMutation.mutate({ id: terminateId, endDate: values.endDate });
              }
            },
            (errors) => focusFirstFormError(errors),
          )}
        >
          <Stack gap="md">
            <TextInput label="End date" type="date" {...terminateForm.getInputProps('endDate')} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setTerminateId(null)}>Cancel</Button>
              <Button type="submit" loading={terminateMutation.isPending}>Confirm</Button>
            </Group>
          </Stack>
        </form>
      </BaseModal>
    </>
  );
}
