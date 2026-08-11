import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Drawer, Group, NumberInput, Paper, SegmentedControl, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Timeline } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCalendarMonth, IconListDetails, IconPlus } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';

import { approveLeaveRequest, cancelLeaveRequest, createLeaveRequest, rejectLeaveRequest, submitLeaveRequest } from '../../features/leave/leaveApi';
import type { LeaveRequest, LeaveRequestPayload } from '../../features/leave/leaveTypes';
import { useLeaveRequests } from '../../features/leave/useLeaveRequests';
import { mockEmployees } from '../../shared/mocks/mockEmployees';
import { LEAVE_TYPE_OPTIONS } from '../../shared/constants/statuses';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { StatusTag } from '../../shared/components/StatusTag';
import { formatDate } from '../../shared/utils/date';
import { useAuth } from '../../features/auth/useAuth';
import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { BaseModal, BaseTable } from '../../shared/ui';
import { focusFirstFormError, zodMantineValidate } from '../../shared/forms/zodMantine';

type LeaveAction = 'submit' | 'approve' | 'reject' | 'cancel';
type ReviewDraft = { id: string; action: LeaveAction } | null;
type LeaveViewMode = 'list' | 'calendar';

const leaveSchema = z.object({
  employeeId: z.string().min(1, 'Chọn nhân sự.'),
  leaveType: z.string().min(1, 'Chọn loại nghỉ.'),
  startDate: z.string().min(1, 'Chọn ngày bắt đầu.'),
  endDate: z.string().min(1, 'Chọn ngày kết thúc.'),
  totalDays: z.number().min(1, 'Số ngày nghỉ phải lớn hơn 0.'),
  reason: z.string().trim().min(1, 'Nhập lý do nghỉ.'),
}).refine(
  (values) => !values.startDate || !values.endDate || values.endDate >= values.startDate,
  { path: ['endDate'], message: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.' },
) satisfies z.ZodType<LeaveRequestPayload>;

const reviewSchema = z.object({
  note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự.'),
});

const emptyLeaveValues: LeaveRequestPayload = {
  employeeId: '',
  leaveType: '',
  startDate: '',
  endDate: '',
  totalDays: 1,
  reason: '',
};

const actionLabels: Record<LeaveAction, string> = {
  submit: 'Submit',
  approve: 'Approve',
  reject: 'Reject',
  cancel: 'Cancel',
};

export function LeavePage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<LeaveViewMode>('list');
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(null);
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    employeeId: undefined as string | undefined,
    leaveType: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const { data, isLoading, error, refetch } = useLeaveRequests(params);

  const form = useForm<LeaveRequestPayload>({
    initialValues: emptyLeaveValues,
    validate: zodMantineValidate(leaveSchema),
    validateInputOnChange: true,
  });
  const reviewForm = useForm<{ note: string }>({
    initialValues: { note: '' },
    validate: zodMantineValidate(reviewSchema),
    validateInputOnChange: true,
  });

  const employeeOptions = mockEmployees.map((item) => ({ value: item.id, label: item.fullName }));
  const leaveTypeOptions = LEAVE_TYPE_OPTIONS.map((item) => ({ value: item, label: item }));
  const statusOptions = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].map((item) => ({ value: item, label: item }));
  const leavesByStartDate = useMemo(
    () =>
      Object.entries(
        (data?.items ?? []).reduce<Record<string, LeaveRequest[]>>((acc, item) => {
          const key = item.startDate;
          acc[key] = [...(acc[key] ?? []), item];
          return acc;
        }, {}),
      ).sort(([left], [right]) => left.localeCompare(right)),
    [data?.items],
  );

  useEffect(() => {
    if (searchParams.get('action') !== 'create') return;
    const timer = window.setTimeout(() => setOpen(true), 0);
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    setSearchParams(next, { replace: true });
    return () => window.clearTimeout(timer);
  }, [searchParams, setSearchParams]);

  const createMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: async () => {
      notifications.show({ color: 'green', title: 'Đã tạo đơn nghỉ', message: 'Đơn nghỉ đã được lưu.' });
      setOpen(false);
      form.setValues(emptyLeaveValues);
      form.resetDirty(emptyLeaveValues);
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: LeaveAction }) => {
      switch (action) {
        case 'submit':
          return submitLeaveRequest(id);
        case 'approve':
          return approveLeaveRequest(id);
        case 'reject':
          return rejectLeaveRequest(id);
        default:
          return cancelLeaveRequest(id);
      }
    },
    onSuccess: async () => {
      notifications.show({ color: 'green', title: 'Đã cập nhật đơn nghỉ', message: 'Trạng thái đơn nghỉ đã được cập nhật.' });
      setReviewDraft(null);
      reviewForm.setValues({ note: '' });
      reviewForm.resetDirty({ note: '' });
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  function closeDrawer() {
    setOpen(false);
    form.setValues(emptyLeaveValues);
    form.resetDirty(emptyLeaveValues);
  }

  function openReview(id: string, action: LeaveAction) {
    reviewForm.setValues({ note: '' });
    reviewForm.resetDirty({ note: '' });
    setReviewDraft({ id, action });
  }

  function handleInvalid(errors: typeof form.errors) {
    focusFirstFormError(errors);
    notifications.show({
      color: 'red',
      title: 'Cần kiểm tra lại đơn nghỉ',
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
        title="Leave"
        subtitle="Leave workflow"
        actions={
          <Group gap="xs">
            <SegmentedControl
              value={viewMode}
              onChange={(value) => setViewMode(value as LeaveViewMode)}
              data={[
                { value: 'list', label: 'List' },
                { value: 'calendar', label: 'Calendar' },
              ]}
            />
            {can(HR_PERMISSIONS.LEAVE_CREATE) ? <Button leftSection={<IconPlus size={16} />} onClick={() => setOpen(true)}>Create</Button> : null}
          </Group>
        }
      />
      <Card className="page-card">
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
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
              placeholder="Leave type"
              data={leaveTypeOptions}
              value={params.leaveType ?? null}
              onChange={(value) => setParams((current) => ({ ...current, page: 1, leaveType: value ?? undefined }))}
            />
            <Select
              clearable
              placeholder="Status"
              data={statusOptions}
              value={params.status ?? null}
              onChange={(value) => setParams((current) => ({ ...current, page: 1, status: value ?? undefined }))}
            />
          </SimpleGrid>

          {viewMode === 'list' ? (
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
                { title: 'Type', dataIndex: 'leaveType' },
                { title: 'Start date', render: (_, record) => formatDate(record.startDate) },
                { title: 'End date', render: (_, record) => formatDate(record.endDate) },
                { title: 'Total days', dataIndex: 'totalDays' },
                { title: 'Status', render: (_, record) => <StatusTag status={record.status} /> },
                {
                  title: 'Actions',
                  render: (_, record) => (
                    <Group gap="xs">
                      <Button size="xs" variant="default" onClick={() => setSelectedLeave(record)}>Timeline</Button>
                      {record.status === 'DRAFT' && can(HR_PERMISSIONS.LEAVE_SUBMIT) ? <Button size="xs" variant="default" onClick={() => openReview(record.id, 'submit')}>Submit</Button> : null}
                      {record.status === 'SUBMITTED' && can(HR_PERMISSIONS.LEAVE_APPROVE) ? <Button size="xs" onClick={() => openReview(record.id, 'approve')}>Approve</Button> : null}
                      {record.status === 'SUBMITTED' && can(HR_PERMISSIONS.LEAVE_REJECT) ? <Button size="xs" color="red" variant="light" onClick={() => openReview(record.id, 'reject')}>Reject</Button> : null}
                      {['DRAFT', 'SUBMITTED'].includes(record.status) && can(HR_PERMISSIONS.LEAVE_CANCEL) ? <Button size="xs" variant="default" onClick={() => openReview(record.id, 'cancel')}>Cancel</Button> : null}
                    </Group>
                  ),
                },
              ]}
            />
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="sm">
              {leavesByStartDate.map(([date, items]) => (
                <Paper key={date} withBorder p="sm" radius="md" className="leave-calendar-day">
                  <Group justify="space-between" mb="xs">
                    <Group gap={6}>
                      <IconCalendarMonth size={16} />
                      <Text fw={700}>{formatDate(date)}</Text>
                    </Group>
                    <Badge color={items.length >= 3 ? 'red' : 'blue'} variant="light">{items.length} đơn</Badge>
                  </Group>
                  <Stack gap={6}>
                    {items.map((item) => (
                      <button key={item.id} type="button" className="leave-calendar-item" onClick={() => setSelectedLeave(item)}>
                        <span>{item.employeeName ?? item.employee?.fullName ?? item.employeeId}</span>
                        <StatusTag status={item.status} />
                      </button>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Card>

      <Drawer
        title="Create leave request"
        opened={open}
        size={500}
        position="right"
        onClose={closeDrawer}
      >
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values), handleInvalid)}>
          <Stack gap="sm">
            <Select label="Employee" data={employeeOptions} searchable {...form.getInputProps('employeeId')} />
            <Select label="Leave type" data={leaveTypeOptions} {...form.getInputProps('leaveType')} />
            <TextInput label="Start date" type="date" {...form.getInputProps('startDate')} />
            <TextInput label="End date" type="date" {...form.getInputProps('endDate')} />
            <NumberInput label="Total days" min={1} {...form.getInputProps('totalDays')} />
            <Textarea label="Reason" rows={3} {...form.getInputProps('reason')} />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeDrawer}>Cancel</Button>
              <Button type="submit" loading={createMutation.isPending}>Save</Button>
            </Group>
          </Stack>
        </form>
      </Drawer>

      <BaseModal
        opened={Boolean(reviewDraft)}
        title={reviewDraft ? `${actionLabels[reviewDraft.action]} leave request` : 'Review leave request'}
        onClose={() => setReviewDraft(null)}
      >
        <form
          onSubmit={reviewForm.onSubmit(
            () => {
              if (reviewDraft) {
                statusMutation.mutate(reviewDraft);
              }
            },
            (errors) => focusFirstFormError(errors),
          )}
        >
          <Stack gap="md">
            <Textarea
              label="Internal note"
              description="Ghi chú này hỗ trợ người duyệt kiểm tra trước khi xác nhận thao tác."
              rows={3}
              {...reviewForm.getInputProps('note')}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setReviewDraft(null)}>Cancel</Button>
              <Button
                type="submit"
                color={reviewDraft?.action === 'reject' ? 'red' : undefined}
                loading={statusMutation.isPending}
              >
                Confirm
              </Button>
            </Group>
          </Stack>
        </form>
      </BaseModal>

      <Drawer
        opened={Boolean(selectedLeave)}
        title="Dòng thời gian đơn nghỉ"
        position="right"
        size={460}
        onClose={() => setSelectedLeave(null)}
      >
        {selectedLeave ? (
          <Stack gap="md">
            <Paper withBorder p="sm" radius="md">
              <Text fw={750}>{selectedLeave.employeeName ?? selectedLeave.employee?.fullName ?? selectedLeave.employeeId}</Text>
              <Text size="sm" c="dimmed">
                {selectedLeave.leaveType} · {formatDate(selectedLeave.startDate)} - {formatDate(selectedLeave.endDate)}
              </Text>
            </Paper>
            <Timeline active={selectedLeave.status === 'APPROVED' ? 2 : selectedLeave.status === 'SUBMITTED' ? 1 : 0} bulletSize={24} lineWidth={2}>
              <Timeline.Item bullet={<IconListDetails size={14} />} title="Nhân viên gửi đơn">
                <Text size="sm" c="dimmed">{selectedLeave.status === 'DRAFT' ? 'Đang soạn, chưa gửi duyệt.' : 'Đã gửi vào quy trình duyệt.'}</Text>
              </Timeline.Item>
              <Timeline.Item title="Trưởng phòng duyệt">
                <Text size="sm" c="dimmed">
                  {selectedLeave.approvalSteps?.[0]?.reviewedAt ? formatDate(selectedLeave.approvalSteps[0].reviewedAt) : selectedLeave.status === 'SUBMITTED' ? 'Đang chờ trưởng phòng hoặc HR xử lý.' : 'Chưa tới bước này.'}
                </Text>
              </Timeline.Item>
              <Timeline.Item title="HR xác nhận">
                <Text size="sm" c="dimmed">
                  {selectedLeave.status === 'APPROVED' ? 'Đơn đã hoàn tất.' : selectedLeave.status === 'REJECTED' ? 'Đơn đã bị từ chối.' : 'Đang chờ hoàn tất.'}
                </Text>
              </Timeline.Item>
            </Timeline>
          </Stack>
        ) : null}
      </Drawer>
    </>
  );
}
