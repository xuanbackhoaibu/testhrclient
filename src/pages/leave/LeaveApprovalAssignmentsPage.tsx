import { useMemo, useState } from 'react';
import { ActionIcon, Alert, Badge, Group, Select, Stack, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconTrash } from '@tabler/icons-react';

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
import { ConfirmActionModal } from '../../shared/components/ConfirmActionModal';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { SectionCard } from '../../shared/components/SectionCard';
import styles from './LeaveApprovalAssignmentsPage.module.css';

interface ApprovalStage {
  code: LeaveApprovalStepCode;
  step: number;
  label: string;
  description: string;
}

interface RemoveTarget {
  stage: ApprovalStage;
  departmentId?: string;
}

const DEPARTMENT_STAGES: ApprovalStage[] = [
  { code: 'ATTENDANCE_TRACKER', step: 1, label: 'Người theo dõi chấm công', description: 'Kiểm tra thông tin phép của phòng ban.' },
  { code: 'DEPARTMENT_MANAGER', step: 2, label: 'Trưởng bộ phận', description: 'Duyệt đơn của nhân sự trong phòng ban.' },
];
const GLOBAL_STAGES: ApprovalStage[] = [
  { code: 'OFFICE_CHIEF', step: 3, label: 'Chánh văn phòng', description: 'Duyệt chung cho toàn công ty.' },
  { code: 'BOARD', step: 4, label: 'Ban Tổng giám đốc', description: 'Duyệt cuối và duyệt trực tiếp đơn của trưởng bộ phận.' },
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
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  const selectedDepartmentId = departmentId ?? departments.data?.[0]?.id ?? null;
  const selectedDepartment = departments.data?.find((item) => item.id === selectedDepartmentId);

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
      item.stepCode === stage.code
      && (scopedDepartmentId ? item.departmentId === scopedDepartmentId : item.scopeType === 'GLOBAL'),
    );
  const reviewerValue = (stage: ApprovalStage, scopedDepartmentId?: string | null) =>
    drafts[keyFor(stage.code, scopedDepartmentId)] ?? assignmentFor(stage, scopedDepartmentId)?.reviewerUserId ?? null;

  const configuredCount = [
    ...DEPARTMENT_STAGES.map((stage) => selectedDepartmentId && assignmentFor(stage, selectedDepartmentId)),
    ...GLOBAL_STAGES.map((stage) => assignmentFor(stage)),
  ].filter(Boolean).length;

  function clearDraft(key: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function changeReviewer(stage: ApprovalStage, reviewerUserId: string | null, scopedDepartmentId?: string | null) {
    const assignment = assignmentFor(stage, scopedDepartmentId);
    if (!reviewerUserId || reviewerUserId === assignment?.reviewerUserId) return;

    const key = keyFor(stage.code, scopedDepartmentId);
    setDrafts((current) => ({ ...current, [key]: reviewerUserId }));
    setSavingKey(key);
    try {
      await upsert.mutateAsync({
        stepCode: stage.code,
        payload: { reviewerUserId, ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}) },
      });
      notifications.show({
        color: 'green',
        title: `Đã cập nhật bước ${stage.step}`,
        message: 'Cấu hình mới áp dụng cho các đơn gửi sau thời điểm này.',
      });
    } catch {
      notifications.show({
        color: 'red',
        title: 'Không cập nhật được người duyệt',
        message: 'Vui lòng thử lại hoặc kiểm tra quyền quản trị phép.',
      });
    } finally {
      clearDraft(key);
      setSavingKey(null);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    const { stage, departmentId: scopedDepartmentId } = removeTarget;
    try {
      await remove.mutateAsync({
        stepCode: stage.code,
        ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}),
      });
      clearDraft(keyFor(stage.code, scopedDepartmentId));
      setRemoveTarget(null);
      notifications.show({
        color: 'blue',
        title: `Đã gỡ người duyệt bước ${stage.step}`,
        message: 'Hãy chọn người thay thế để nhân sự có thể gửi đơn mới.',
      });
    } catch {
      notifications.show({
        color: 'red',
        title: 'Không gỡ được người duyệt',
        message: 'Vui lòng thử lại hoặc kiểm tra quyền quản trị phép.',
      });
    }
  }

  function stageRow(stage: ApprovalStage, scopedDepartmentId?: string | null) {
    const assignment = assignmentFor(stage, scopedDepartmentId);
    const key = keyFor(stage.code, scopedDepartmentId);
    const isSaving = savingKey === key;

    return (
      <div className={styles.stage} key={key}>
        <div className={styles.stageInfo}>
          <span className={styles.stepNumber} aria-hidden="true">{stage.step}</span>
          <div>
            <Group gap="xs" wrap="wrap">
              <Text fw={600}>{stage.label}</Text>
              <Badge size="sm" variant="light" color={isSaving ? 'blue' : assignment ? 'green' : 'gray'}>
                {isSaving ? 'Đang lưu' : assignment ? 'Đã cấu hình' : 'Chưa cấu hình'}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">{stage.description}</Text>
          </div>
        </div>

        <div className={styles.stageControl}>
          <Select
            className={styles.reviewerSelect}
            label={`Người duyệt bước ${stage.step}`}
            aria-label={`Người duyệt bước ${stage.step}: ${stage.label}`}
            placeholder="Chọn người duyệt"
            data={reviewerOptions}
            value={reviewerValue(stage, scopedDepartmentId)}
            searchable
            nothingFoundMessage="Không tìm thấy người dùng"
            disabled={!canUpdate || reviewerOptions.length === 0 || upsert.isPending || remove.isPending}
            onChange={(next) => void changeReviewer(stage, next, scopedDepartmentId)}
          />
          {assignment && canUpdate ? (
            <Tooltip label="Gỡ người duyệt">
              <ActionIcon
                className={styles.removeButton}
                variant="subtle"
                color="red"
                size="lg"
                aria-label={`Gỡ người duyệt bước ${stage.step}`}
                disabled={upsert.isPending || remove.isPending}
                onClick={() => setRemoveTarget({ stage, ...(scopedDepartmentId ? { departmentId: scopedDepartmentId } : {}) })}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          ) : null}
        </div>
      </div>
    );
  }

  if (assignments.isLoading || reviewers.isLoading || departments.isLoading) return <LoadingState />;
  if (assignments.error || reviewers.error || departments.error) {
    return <ErrorState onRetry={() => { void assignments.refetch(); void reviewers.refetch(); void departments.refetch(); }} />;
  }

  return (
    <>
      <PageHeader
        title="Thiết lập người duyệt phép"
        subtitle="Chọn người phụ trách theo đúng thứ tự 4 bước. Thay đổi chỉ áp dụng cho đơn mới; đơn đã gửi giữ nguyên luồng duyệt."
      />
      <Stack gap="lg">
        {!canUpdate ? (
          <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light" title="Bạn đang xem cấu hình">
            Tài khoản này chưa có quyền thay đổi người duyệt phép.
          </Alert>
        ) : null}
        {reviewerOptions.length === 0 ? (
          <Alert color="orange" title="Chưa có người dùng HRM hoạt động">
            Hãy cấp hoặc liên kết tài khoản HRM trước khi chọn người duyệt.
          </Alert>
        ) : null}
        {selectedDepartmentId && configuredCount < 4 ? (
          <Alert color="orange" variant="light" title={`Còn ${4 - configuredCount} bước chưa có người duyệt`}>
            Cần chọn đủ 4 bước để nhân sự của phòng ban này có thể gửi đơn.
          </Alert>
        ) : null}

        <SectionCard
          title="Luồng duyệt 4 bước"
          count={`${configuredCount}/4 bước đã cấu hình`}
          description="Bước 1–2 theo từng phòng ban; bước 3–4 dùng chung cho toàn công ty. Chọn người mới là hệ thống tự lưu."
        >
          <div className={styles.scopeHeader}>
            <div>
              <Text fw={600}>Theo phòng ban</Text>
              <Text size="sm" c="dimmed">Chọn phòng ban cần xem hoặc cấu hình.</Text>
            </div>
            <Select
              className={styles.departmentSelect}
              label="Phòng ban"
              placeholder="Chọn phòng ban"
              data={departmentOptions}
              value={selectedDepartmentId}
              searchable
              nothingFoundMessage="Không tìm thấy phòng ban"
              disabled={departmentOptions.length === 0}
              onChange={setDepartmentId}
            />
          </div>

          {selectedDepartmentId ? (
            DEPARTMENT_STAGES.map((stage) => stageRow(stage, selectedDepartmentId))
          ) : (
            <Text className={styles.empty} size="sm" c="dimmed">Chưa có phòng ban hoạt động để cấu hình.</Text>
          )}

          <div className={styles.scopeHeader}>
            <div>
              <Text fw={600}>Dùng chung toàn công ty</Text>
              <Text size="sm" c="dimmed">
                Áp dụng cho mọi phòng ban{selectedDepartment ? `, bao gồm ${selectedDepartment.name}` : ''}.
              </Text>
            </div>
          </div>
          {GLOBAL_STAGES.map((stage) => stageRow(stage))}
        </SectionCard>
      </Stack>

      <ConfirmActionModal
        opened={Boolean(removeTarget)}
        title="Gỡ người duyệt?"
        message={removeTarget
          ? `Bước ${removeTarget.stage.step} sẽ bị bỏ trống. Nhân sự có thể không gửi được đơn mới cho đến khi bạn chọn người thay thế.`
          : ''}
        confirmLabel="Gỡ người duyệt"
        loading={remove.isPending}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}
