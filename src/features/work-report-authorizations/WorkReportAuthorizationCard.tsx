import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Drawer,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Employee } from '../employees/employeeTypes';
import {
  activateWorkReportAuthorization,
  createWorkReportAuthorization,
  getWorkReportAuthorization,
  getWorkReportAuthorizationHistory,
  revokeWorkReportAuthorization,
  updateWorkReportAuthorization,
  type WorkReportAuthorizationLevel,
  type WorkReportAuthorizationScopeSource,
} from './workReportAuthorizationsApi';
import { listAllDepartments } from '../organization/departmentsApi';
import { listAllUnits } from '../organization/unitsApi';

type Props = {
  employee: Employee;
  authUserId: string;
  canRead: boolean;
  canManage: boolean;
  canAudit: boolean;
};

export function WorkReportAuthorizationCard({ employee, authUserId, canRead, canManage, canAudit }: Props) {
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [level, setLevel] = useState<WorkReportAuthorizationLevel>('DEPARTMENT');
  const [scopeSource, setScopeSource] = useState<WorkReportAuthorizationScopeSource>('PROFILE');
  const [canAggregate, setCanAggregate] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);
  const [reason, setReason] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [revokeOpened, setRevokeOpened] = useState(false);

  const authorizationQuery = useQuery({
    queryKey: ['work-report-authorization', authUserId],
    queryFn: () => getWorkReportAuthorization(authUserId),
    enabled: canRead,
  });
  const delegatedScopeEnabled = opened && scopeSource === 'DELEGATION' && level !== 'GROUP';
  const companiesQuery = useQuery({
    queryKey: ['work-report-authorization-companies'],
    queryFn: () => listAllUnits({ status: 'ACTIVE' }),
    enabled: delegatedScopeEnabled,
  });
  const departmentsQuery = useQuery({
    queryKey: ['work-report-authorization-departments', companyId || null],
    queryFn: () => listAllDepartments({ status: 'ACTIVE', unitId: companyId }),
    enabled: delegatedScopeEnabled && level === 'DEPARTMENT' && Boolean(companyId),
  });
  const historyQuery = useQuery({
    queryKey: ['work-report-authorization-history', authUserId],
    queryFn: () => getWorkReportAuthorizationHistory(authUserId),
    enabled: opened && canAudit,
  });

  const openManagement = () => {
    const grant = authorizationQuery.data;
    if (grant) {
      setLevel(grant.level);
      setScopeSource(grant.scopeSource);
      setCanAggregate(grant.capabilities.includes('AGGREGATE'));
      setCanSubmit(grant.capabilities.includes('SUBMIT'));
      setReason(grant.reason ?? '');
      setCompanyId(grant.scope.companyId ?? '');
      setDepartmentId(grant.scope.departmentId ?? '');
      setEffectiveFrom(grant.effectiveFrom?.slice(0, 16) ?? '');
      setExpiresAt(grant.expiresAt?.slice(0, 16) ?? '');
    }
    setOpened(true);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['work-report-authorization', authUserId] });
    await queryClient.invalidateQueries({ queryKey: ['work-report-authorization-history', authUserId] });
  };
  const writePayload = () => ({
    authUserId,
    employeeId: employee.id,
    level,
    scopeSource,
    canAggregate,
    canSubmit: level === 'GROUP' ? false : canSubmit,
    isGlobal: level === 'GROUP',
    ...(scopeSource === 'DELEGATION' && companyId.trim() ? { companyId: companyId.trim() } : {}),
    ...(scopeSource === 'DELEGATION' && departmentId.trim() ? { departmentId: departmentId.trim() } : {}),
    ...(reason.trim() ? { reason: reason.trim() } : {}),
    ...(effectiveFrom ? { effectiveFrom: new Date(effectiveFrom).toISOString() } : {}),
    ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
  });
  const validateWrite = () => {
    if (scopeSource !== 'DELEGATION' || level === 'GROUP') return;
    if (!companyId.trim() || (level === 'DEPARTMENT' && !departmentId.trim())) {
      throw new Error('Chọn đơn vị và, với phạm vi phòng ban, chọn thêm phòng ban.');
    }
    if (!reason.trim()) throw new Error('Nhập lý do cấp hoặc thay đổi quyền.');
    if (effectiveFrom && expiresAt && new Date(expiresAt) < new Date(effectiveFrom)) throw new Error('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      validateWrite();
      const current = authorizationQuery.data;
      return current
        ? updateWorkReportAuthorization(authUserId, { ...writePayload(), version: current.authorizationVersion })
        : createWorkReportAuthorization(writePayload());
    },
    onSuccess: async () => {
      notifications.show({ color: 'green', message: 'Đã lưu cấu hình phân quyền. Dữ liệu đang được đọc lại từ hệ thống.' });
      await refresh();
      setReviewing(false);
    },
    onError: (error: Error) => notifications.show({ color: 'red', message: error.message }),
  });
  const activateMutation = useMutation({
    mutationFn: () => activateWorkReportAuthorization(authUserId, authorizationQuery.data!.authorizationVersion, reason.trim() || undefined),
    onSuccess: refresh,
    onError: (error: Error) => notifications.show({ color: 'red', message: error.message }),
  });
  const revokeMutation = useMutation({
    mutationFn: () => revokeWorkReportAuthorization(authUserId, authorizationQuery.data!.authorizationVersion, reason.trim() || undefined),
    onSuccess: refresh,
    onError: (error: Error) => notifications.show({ color: 'red', message: error.message }),
  });

  if (!canRead && !canManage) return null;
  const grant = authorizationQuery.data;

  const scopeLabel = grant?.scope.departmentName ?? grant?.scope.companyName ?? (grant?.scope.isGlobal ? 'Toàn Tổng công ty' : 'Hệ thống sẽ xác định khi áp dụng');
  const statusLabel: Record<string, string> = { ACTIVE: 'Đang hoạt động', DRAFT: 'Bản nháp', REVOKED: 'Đã thu hồi', EXPIRED: 'Đã hết hạn', INVALID: 'Không hợp lệ' };
  return (
    <Alert color="grape" title="Quyền Báo cáo công việc">
      {authorizationQuery.isLoading ? <Loader size="xs" /> : (
        <Stack gap="xs">
          <Text size="sm">Quyền Báo cáo công việc được quản lý theo quan hệ nhân sự và ủy quyền chuyên biệt, không cấp qua quyền riêng thông thường.</Text>
          {grant ? (
            <Group gap="xs">
              <Badge color={grant.status === 'ACTIVE' ? 'green' : 'gray'}>{statusLabel[grant.status] ?? grant.status}</Badge>
              <Badge variant="light">{scopeLabel}</Badge>
            </Group>
          ) : <Text size="sm" c="dimmed">Chưa có cấu hình quyền Báo cáo công việc.</Text>}
          <Group>
            <Button size="xs" variant={canManage ? 'light' : 'subtle'} onClick={openManagement}>
              {canManage ? 'Quản lý quyền Báo cáo công việc' : 'Xem quyền Báo cáo công việc'}
            </Button>
          </Group>
        </Stack>
      )}

      <Drawer opened={opened} onClose={() => setOpened(false)} title={grant ? 'Chỉnh sửa quyền Báo cáo công việc' : 'Cấp quyền Báo cáo công việc'} position="right" size="xl">
        {authorizationQuery.isLoading ? <Loader size="sm" /> : (
          <Stack gap="sm">
            <Stack gap={0}><Text fw={600}>{employee.fullName}</Text><Text size="sm" c="dimmed">Mã nhân viên: {employee.employeeCode ?? 'Chưa có'}</Text></Stack>
            {grant ? (
              <Alert color="blue" title="Trạng thái phân quyền"><Stack gap={2}><Text size="sm">Trạng thái: {statusLabel[grant.status] ?? grant.status}</Text><Text size="sm">Phạm vi hiện tại: {scopeLabel}</Text><Text size="sm">Nguồn phạm vi: {grant.scopeSource === 'PROFILE' ? 'Theo hồ sơ nhân sự' : 'Theo ủy quyền riêng'}</Text><Text size="sm">Cập nhật lần cuối: {new Date(grant.updatedAt).toLocaleString('vi-VN')}</Text><Text size="sm">Hiệu lực: Chưa có contract đồng bộ principal để xác minh trạng thái phiên đăng nhập.</Text></Stack></Alert>
            ) : <Alert color="yellow">Chưa có cấu hình. Lưu sẽ tạo bản nháp để máy chủ kiểm tra trước khi kích hoạt.</Alert>}

            <Text fw={600}>1. Phạm vi được xem và quản lý</Text>
            <Select label="Phạm vi áp dụng" value={level} onChange={(value) => setLevel((value ?? 'DEPARTMENT') as WorkReportAuthorizationLevel)} disabled={!canManage} data={[{ value: 'DEPARTMENT', label: 'Một phòng ban' }, { value: 'COMPANY', label: 'Một đơn vị' }, { value: 'GROUP', label: 'Toàn Tổng công ty' }]} />
            <Select label="Cách xác định nhân sự trong phạm vi" value={scopeSource} onChange={(value) => setScopeSource((value ?? 'PROFILE') as WorkReportAuthorizationScopeSource)} disabled={!canManage} data={[{ value: 'PROFILE', label: 'Theo hồ sơ nhân sự hiện tại' }, { value: 'DELEGATION', label: 'Theo đơn vị/phòng ban được chọn' }]} />
            {scopeSource === 'DELEGATION' && level !== 'GROUP' ? <Select label="Đơn vị / công ty" placeholder="Chọn đơn vị" value={companyId || null} onChange={(value) => { setCompanyId(value ?? ''); setDepartmentId(''); }} disabled={!canManage} required searchable clearable data={(companiesQuery.data ?? []).map((unit) => ({ value: unit.id, label: `${unit.code} · ${unit.name}` }))} error={companiesQuery.isError ? 'Không tải được danh mục đơn vị.' : undefined} /> : null}
            {scopeSource === 'DELEGATION' && level === 'DEPARTMENT' ? <Select label="Phòng ban" placeholder={companyId ? 'Chọn phòng ban' : 'Chọn đơn vị trước'} value={departmentId || null} onChange={(value) => setDepartmentId(value ?? '')} disabled={!canManage || !companyId} required searchable clearable data={(departmentsQuery.data ?? []).map((department) => ({ value: department.id, label: `${department.code} · ${department.name}` }))} error={departmentsQuery.isError ? 'Không tải được danh mục phòng ban.' : undefined} /> : null}
            <Text fw={600}>2. Khả năng được phép</Text>
            <Checkbox label="Tổng hợp báo cáo" description="Có thể tạo báo cáo tổng hợp từ dữ liệu nhân sự thuộc phạm vi được cấp." checked={canAggregate} onChange={(event) => setCanAggregate(event.currentTarget.checked)} disabled={!canManage} />
            <Checkbox label="Gửi báo cáo tổng hợp" description="Có thể gửi báo cáo tổng hợp lên cấp quản lý tiếp theo." checked={canSubmit} onChange={(event) => setCanSubmit(event.currentTarget.checked)} disabled={!canManage || level === 'GROUP'} />
            <Text fw={600}>Thời gian áp dụng</Text><TextInput type="datetime-local" label="Có hiệu lực từ" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.currentTarget.value)} disabled={!canManage} /><TextInput type="datetime-local" label="Hết hiệu lực lúc" value={expiresAt} onChange={(event) => setExpiresAt(event.currentTarget.value)} disabled={!canManage} />
            <Textarea label="Lý do cấp hoặc thay đổi quyền" description="Lý do được lưu trong lịch sử phân quyền để phục vụ kiểm tra và truy vết." value={reason} onChange={(event) => setReason(event.currentTarget.value)} disabled={!canManage} required />

            {canManage ? <Group justify="flex-end">
              {grant?.status === 'ACTIVE' ? <Button color="red" variant="light" onClick={() => setRevokeOpened(true)}>Thu hồi quyền</Button> : null}
              {grant && grant.status !== 'ACTIVE' && grant.status !== 'REVOKED' ? <Button color="green" variant="light" loading={activateMutation.isPending} onClick={() => activateMutation.mutate()}>Kích hoạt quyền</Button> : null}
              <Button variant="default" onClick={() => setReviewing(!reviewing)}>Kiểm tra lại</Button><Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{grant ? 'Lưu thay đổi' : 'Cấp quyền'}</Button>
            </Group> : null}
            {reviewing ? <Alert color="blue" title="3. Thông tin đang yêu cầu thay đổi"><Text size="sm">Phạm vi: {scopeSource === 'PROFILE' ? 'Theo hồ sơ nhân sự hiện tại' : 'Theo đơn vị/phòng ban được chọn'}; quyền: {canAggregate ? 'Tổng hợp báo cáo' : 'Không tổng hợp'}{canSubmit ? ', Gửi báo cáo tổng hợp' : ''}. Máy chủ sẽ kiểm tra lại thẩm quyền, phạm vi và tính hợp lệ khi lưu.</Text></Alert> : null}
            {historyQuery.data?.length ? <Text size="sm" fw={600}>Lịch sử thay đổi ({historyQuery.data.length})</Text> : canAudit ? <Text size="sm" c="dimmed">Lịch sử chi tiết chưa được hệ thống cung cấp.</Text> : null}
            {revokeOpened ? <Alert color="red" title="Thu hồi quyền Báo cáo công việc"><Stack><Text size="sm">Người dùng sẽ không còn được xem, tổng hợp hoặc gửi báo cáo trong phạm vi {scopeLabel} sau khi thay đổi có hiệu lực.</Text><Textarea label="Lý do thu hồi" value={reason} onChange={(event) => setReason(event.currentTarget.value)} required /><Group><Button variant="default" onClick={() => setRevokeOpened(false)}>Hủy</Button><Button color="red" loading={revokeMutation.isPending} onClick={() => { if (!reason.trim()) return notifications.show({ color: 'red', message: 'Nhập lý do thu hồi quyền.' }); revokeMutation.mutate(); setRevokeOpened(false); }}>Xác nhận thu hồi quyền</Button></Group></Stack></Alert> : null}
          </Stack>
        )}
      </Drawer>
    </Alert>
  );
}
