import { useMemo, useState } from 'react';
import { Button, Drawer, Grid, Group, Modal, Paper, Select, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createContract, terminateContract } from '../../features/contracts/contractsApi';
import type { Contract, ContractPayload } from '../../features/contracts/contractTypes';
import { useContracts } from '../../features/contracts/useContracts';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { CONTRACT_TYPE_OPTIONS } from '../../shared/constants/statuses';
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { HrmDateInput } from '../../shared/components/HrmDateInput';
import { formatDate } from '../../shared/utils/date';
import { toast } from '../../shared/utils/toast';

const EMPLOYEE_OPTIONS = mockEmployees.map((item) => ({ value: item.id, label: item.fullName }));
const STATUS_FILTER_OPTIONS = ['ACTIVE', 'COMPLETED', 'TERMINATED'];

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
    initialValues: {
      employeeId: '',
      contractNo: '',
      contractType: '',
      startDate: '',
      endDate: undefined,
      status: 'ACTIVE',
    },
    validate: {
      employeeId: (value) => (value ? null : 'Chọn nhân viên.'),
      contractNo: (value) => (value.trim() ? null : 'Nhập số hợp đồng.'),
      contractType: (value) => (value ? null : 'Chọn loại hợp đồng.'),
      startDate: (value) => (value ? null : 'Chọn ngày bắt đầu.'),
      status: (value) => (value ? null : 'Chọn trạng thái.'),
    },
  });

  const terminateForm = useForm<{ endDate: string }>({
    initialValues: { endDate: '' },
    validate: { endDate: (value) => (value ? null : 'Chọn ngày kết thúc.') },
  });

  function closeDrawer() {
    setOpen(false);
    form.reset();
  }

  const createMutation = useMutation({
    mutationFn: createContract,
    onSuccess: async () => {
      toast.success('Đã tạo hợp đồng.');
      closeDrawer();
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (mutationError: unknown) => {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Không tạo được hợp đồng.');
    },
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) => terminateContract(id, { endDate }),
    onSuccess: async () => {
      toast.success('Đã chấm dứt hợp đồng.');
      setTerminateId(null);
      terminateForm.reset();
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (mutationError: unknown) => {
      toast.error(
        mutationError instanceof Error ? mutationError.message : 'Không chấm dứt được hợp đồng.',
      );
    },
  });

  const columns = useMemo<DataTableColumn<Contract>[]>(
    () => [
      { key: 'employeeName', header: 'Nhân viên', render: (record) => record.employeeName },
      { key: 'contractNo', header: 'Số hợp đồng', render: (record) => record.contractNo },
      { key: 'contractType', header: 'Loại', render: (record) => record.contractType },
      { key: 'startDate', header: 'Ngày bắt đầu', render: (record) => formatDate(record.startDate) },
      { key: 'endDate', header: 'Ngày kết thúc', render: (record) => formatDate(record.endDate) },
      { key: 'status', header: 'Trạng thái', render: (record) => <StatusTag status={record.status} /> },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (record) =>
          record.status !== 'TERMINATED' ? (
            <Button size="xs" variant="light" onClick={() => setTerminateId(record.id)}>
              Chấm dứt
            </Button>
          ) : null,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Hợp đồng"
        subtitle="Demo metadata hợp đồng cho HRM phase 1."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setOpen(true)}>
            Tạo mới
          </Button>
        }
      />
      <Paper className="page-card" p="lg" radius="md">
        <Stack gap="md">
          <Grid gap="sm">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Select
                clearable
                placeholder="Nhân viên"
                aria-label="Lọc theo nhân viên"
                data={EMPLOYEE_OPTIONS}
                value={params.employeeId ?? null}
                onChange={(value) =>
                  setParams((current) => ({ ...current, page: 1, employeeId: value ?? undefined }))
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                clearable
                placeholder="Trạng thái"
                aria-label="Lọc theo trạng thái"
                data={STATUS_FILTER_OPTIONS}
                value={params.status ?? null}
                onChange={(value) =>
                  setParams((current) => ({ ...current, page: 1, status: value ?? undefined }))
                }
              />
            </Grid.Col>
          </Grid>

          <DataTable
            data={data?.items ?? []}
            columns={columns}
            rowKey={(record) => record.id}
            meta={data?.pagination}
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            onPageChange={(page, pageSize) => setParams((current) => ({ ...current, page, pageSize }))}
            emptyTitle="Chưa có hợp đồng"
            emptyDescription="Không có hợp đồng phù hợp với bộ lọc hiện tại."
          />
        </Stack>
      </Paper>

      <Drawer
        opened={open}
        onClose={closeDrawer}
        title="Tạo hợp đồng"
        position="right"
        size={460}
      >
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack gap="md">
            <Select
              label="Nhân viên"
              withAsterisk
              data={EMPLOYEE_OPTIONS}
              searchable
              {...form.getInputProps('employeeId')}
            />
            <TextInput label="Số hợp đồng" withAsterisk {...form.getInputProps('contractNo')} />
            <Select
              label="Loại hợp đồng"
              withAsterisk
              data={[...CONTRACT_TYPE_OPTIONS]}
              {...form.getInputProps('contractType')}
            />
            <HrmDateInput
              label="Ngày bắt đầu"
              withAsterisk
              {...form.getInputProps('startDate')}
            />
            <HrmDateInput label="Ngày kết thúc" {...form.getInputProps('endDate')} />
            <Select
              label="Trạng thái"
              withAsterisk
              data={['ACTIVE', 'COMPLETED']}
              {...form.getInputProps('status')}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDrawer}>
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
        opened={Boolean(terminateId)}
        title="Chấm dứt hợp đồng"
        centered
        onClose={() => setTerminateId(null)}
      >
        <form
          onSubmit={terminateForm.onSubmit((values) => {
            if (terminateId) {
              terminateMutation.mutate({ id: terminateId, endDate: values.endDate });
            }
          })}
        >
          <Stack gap="md">
            <HrmDateInput label="Ngày kết thúc" withAsterisk {...terminateForm.getInputProps('endDate')} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setTerminateId(null)}>
                Hủy
              </Button>
              <Button type="submit" loading={terminateMutation.isPending}>
                Xác nhận
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
