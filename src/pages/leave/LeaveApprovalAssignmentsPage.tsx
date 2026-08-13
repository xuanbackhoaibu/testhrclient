import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconInfoCircle, IconTrash } from '@tabler/icons-react';

import { HR_PERMISSIONS } from '../../features/auth/permissions';
import { useAuth } from '../../features/auth/useAuth';
import type { LeaveApprovalStepCode } from '../../features/leave/leaveApprovalTypes';
import {
  useDeleteLeaveApprovalAssignment,
  useLeaveApprovalAssignments,
  useLeaveApprovalReviewers,
  useUpsertLeaveApprovalAssignment,
} from '../../features/leave/useLeaveApprovalAssignments';
import { useAllDepartments } from '../../features/organization/useDepartments';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';

interface ApprovalStage {
  code: LeaveApprovalStepCode;
  label: string;
  description: string;
}

const DEPARTMENT_STAGES: ApprovalStage[] = [
  { code: 'ATTENDANCE_TRACKER', label: '1. Người theo dõi chấm công', description: 'Kiểm tra phép của phòng ban.' },
  { code: 'DEPARTMENT_MANAGER', label: '2. Trưởng bộ phận', description: 'Duyệt đơn của nhân sự phòng ban.' },
];
const GLOBAL_STAGES: ApprovalStage[] = [
  { code: 'OFFICE_CHIEF', label: '3. Chánh văn phòng', description: 'Cấp duyệt chung toàn công ty.' },
  { code: 'BOARD', label: '4. Ban Tổng giám đốc', description: 'Cấp cuối; cũng duyệt thẳng đơn của trưởng bộ phận.' },
];

function keyFor(stepCode: LeaveApprovalStepCode, departmentId?: string | null) {
  return `${stepCode}:${departmentId ?? 'GLOBAL'}`;
}

export function LeaveApprovalAssignmentsPage() {
  const { can } = useAuth();
  const canUpdate = can(HR_PERMISSIONS.LEAVE_UPDATE);
  const assignments = useLeaveApprovalAssignments();
  const reviewers = useLeaveApprovalReviewers();
  const departments = useAllDepartments({ status: 'ACTIVE' });
  const upsert = useUpsertLeaveApprovalAssignment();
  const remove = useDeleteLeaveApprovalAssignment();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!departmentId && departments.data?.[0]) {
      setDepartmentId(departments.data[0].id);
    }
  }, [departmentId, departments.data]);

  const reviewerOptions = useMemo(
    () => (reviewers.data ?? []).map((reviewer) => ({
      value: reviewer.id,
      label: reviewer.email ? `${reviewer.fullName ?? 'Chưa có họ tên'} — ${reviewer.email}` : reviewer.fullName ?? reviewer.id,
    })),
    [reviewers.data],
  );
  const departmentOptions = useMemo(
    () => (departments.data ?? []).map((department) => ({
      value: department.id,
      label: `${department.code} — ${department.name}`,
    })),
    [departments.data],
  );

  const assignmentFor = (stage: ApprovalStage, scopedDepartmentId?: string | null) =>
    (assignments.data ?? []).find((item) =>
      item.stepCode === stage.code &&
      (scopedDepartmentId ? item.departmentId === scopedDepartmentId : item.scopeType === 'GLOBAL'),
    );
  const reviewerValue = (stage: ApprovalStage, scopedDepartmentId?: string | null) =>
    drafts[keyFor(stage.code, scopedDepartmentId)] ?? assignmentFor(stage, scopedDepartmentId)?.reviewerUserId ?? null;

  async function save(stage: ApprovalStage, scopedDepartmentId?: string | null) {
    const reviewerUserId = reviewerValue(stage, scopedDepartmentId);
    if (!reviewerUserId) {
      notifications.show({ color: 'red', title: 'Chưa chọn người duyệt', message: 'Chỉ được chọn người dùng HRM đang hoạt động.' });
      return;
    }
    try {
      await upsert.mutateAsync({ stepCode: stage.code, payload: { reviewerUserId, ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}) } });
      notifications.show({ color: 'green', title: 'Đã lưu người duyệt', message: 'Đơn nộp sau thời điểm này sẽ chụp lại cấu hình mới.' });
    } catch {
      notifications.show({ color: 'red', title: 'Không lưu được cấu hình', message: 'Cần quyền cập nhật phép và phạm vi toàn công ty.' });
    }
  }

  async function clear(stage: ApprovalStage, scopedDepartmentId?: string | null) {
    try {
      await remove.mutateAsync({ stepCode: stage.code, ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}) });
      notifications.show({ color: 'blue', title: 'Đã gỡ cấu hình', message: 'Đơn mới sẽ bị chặn trình nếu thiếu cấp duyệt này.' });
    } catch {
      notifications.show({ color: 'red', title: 'Không gỡ được cấu hình', message: 'Kiểm tra lại phạm vi quản trị.' });
    }
  }

  function stageCard(stage: ApprovalStage, scopedDepartmentId?: string | null) {
    const assignment = assignmentFor(stage, scopedDepartmentId);
    const value = reviewerValue(stage, scopedDepartmentId);
    return (
      <Card key={keyFor(stage.code, scopedDepartmentId)} withBorder padding="md" radius="sm">
        <Stack gap="sm">
          <div>
            <Text fw={600}>{stage.label}</Text>
            <Text size="sm" c="dimmed">{stage.description}</Text>
          </div>
          <Select
            label="Người duyệt"
            placeholder="Chọn người dùng HRM"
            data={reviewerOptions}
            value={value}
            searchable
            disabled={!canUpdate || reviewerOptions.length === 0}
            onChange={(next) => setDrafts((current) => ({ ...current, [keyFor(stage.code, scopedDepartmentId)]: next }))}
          />
          {assignment ? <Text size="xs" c="dimmed">Đang áp dụng: {assignment.reviewer.fullName ?? assignment.reviewer.id}</Text> : null}
          <Group justify="flex-end">
            {assignment ? (
              <Button variant="subtle" color="red" size="xs" leftSection={<IconTrash size={14} />} disabled={!canUpdate || remove.isPending} onClick={() => void clear(stage, scopedDepartmentId)}>
                Gỡ
              </Button>
            ) : null}
            <Button size="xs" leftSection={<IconDeviceFloppy size={14} />} disabled={!canUpdate || reviewerOptions.length === 0} loading={upsert.isPending} onClick={() => void save(stage, scopedDepartmentId)}>
              Lưu
            </Button>
          </Group>
        </Stack>
      </Card>
    );
  }

  if (assignments.isLoading || reviewers.isLoading || departments.isLoading) return <LoadingState />;
  if (assignments.error || reviewers.error || departments.error) {
    return <ErrorState onRetry={() => { void assignments.refetch(); void reviewers.refetch(); void departments.refetch(); }} />;
  }

  return (
    <>
      <PageHeader title="Cấu hình duyệt nghỉ phép" subtitle="Mọi đơn đi đủ 4 cấp cố định; riêng trưởng bộ phận nộp đơn đi thẳng Ban Tổng giám đốc. Không có ủy quyền duyệt thay." />
      <Stack gap="lg">
        <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light" title="Người duyệt được chụp vào lúc nộp đơn">
          Đổi cấu hình không sửa lịch sử. Thiếu một cấp bắt buộc thì backend chặn nộp đơn thay vì để đơn không có người duyệt.
        </Alert>
        {reviewerOptions.length === 0 ? <Alert color="orange" title="Chưa có người dùng HRM hoạt động">Hãy liên kết/cấp tài khoản cho người duyệt; giao diện không nhận ID thủ công.</Alert> : null}
        <Card withBorder padding="lg" radius="md">
          <Stack gap="md">
            <div><Title order={3} size="h5">Cấp dùng chung toàn công ty</Title><Text size="sm" c="dimmed">Chánh văn phòng và Ban Tổng giám đốc không gắn phòng ban.</Text></div>
            <SimpleGrid cols={{ base: 1, md: 2 }}>{GLOBAL_STAGES.map((stage) => stageCard(stage))}</SimpleGrid>
          </Stack>
        </Card>
        <Card withBorder padding="lg" radius="md">
          <Stack gap="md">
            <div><Title order={3} size="h5">Cấp theo phòng ban</Title><Text size="sm" c="dimmed">Mỗi phòng phải có người theo dõi chấm công và trưởng bộ phận.</Text></div>
            <Select label="Phòng ban" placeholder="Chọn phòng ban" data={departmentOptions} value={departmentId} searchable disabled={!canUpdate || departmentOptions.length === 0} onChange={setDepartmentId} />
            {departmentId ? <SimpleGrid cols={{ base: 1, md: 2 }}>{DEPARTMENT_STAGES.map((stage) => stageCard(stage, departmentId))}</SimpleGrid> : <Text size="sm" c="dimmed">Chưa có phòng ban hoạt động để cấu hình.</Text>}
          </Stack>
        </Card>
      </Stack>
    </>
  );
}
