import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
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

  const authorizationQuery = useQuery({
    queryKey: ['work-report-authorization', authUserId],
    queryFn: () => getWorkReportAuthorization(authUserId),
    enabled: canRead,
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
  });
  const validateWrite = () => {
    if (scopeSource !== 'DELEGATION' || level === 'GROUP') return;
    if (!companyId.trim() || (level === 'DEPARTMENT' && !departmentId.trim())) {
      throw new Error('Delegation scope requires the company ID and, for department level, the department ID.');
    }
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
      notifications.show({ color: 'green', message: 'Đã lưu Work Report authorization.' });
      await refresh();
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

  return (
    <Alert color="grape" title="Quyền Báo cáo công việc">
      {authorizationQuery.isLoading ? <Loader size="xs" /> : (
        <Stack gap="xs">
          <Text size="sm">Work Report permissions are managed by HRM business authorization, not generic account permissions.</Text>
          {grant ? (
            <Group gap="xs">
              <Badge color={grant.status === 'ACTIVE' ? 'green' : 'gray'}>{grant.status}</Badge>
              <Badge variant="light">{grant.level}</Badge>
              <Badge variant="light">v{grant.authorizationVersion}</Badge>
              {grant.capabilities.map((capability) => <Badge key={capability} color="grape" variant="light">{capability}</Badge>)}
            </Group>
          ) : <Text size="sm" c="dimmed">Chưa có Work Report authorization hiện tại.</Text>}
          <Group>
            <Button size="xs" variant={canManage ? 'light' : 'subtle'} onClick={openManagement}>
              {canManage ? 'Quản lý quyền Báo cáo công việc' : 'Xem quyền Báo cáo công việc'}
            </Button>
          </Group>
        </Stack>
      )}

      <Modal opened={opened} onClose={() => setOpened(false)} title="Work Report Authorization" size="lg">
        {authorizationQuery.isLoading ? <Loader size="sm" /> : (
          <Stack gap="sm">
            <Text size="sm">Target: {employee.fullName} · {authUserId}</Text>
            {grant ? (
              <Alert color="blue">
                Status {grant.status}; source version {grant.authorizationVersion}; scope {grant.scope.departmentName ?? grant.scope.companyName ?? (grant.scope.isGlobal ? 'Global' : '-')}; granted by {grant.grantedBy ?? '-'}; updated {grant.updatedAt}.
              </Alert>
            ) : <Alert color="yellow">Chưa có grant. Lưu sẽ tạo một HRM Work Report authorization ở trạng thái DRAFT.</Alert>}

            <Select label="Scope level" value={level} onChange={(value) => setLevel((value ?? 'DEPARTMENT') as WorkReportAuthorizationLevel)} disabled={!canManage} data={['DEPARTMENT', 'COMPANY', 'GROUP']} />
            <Select label="Scope source" value={scopeSource} onChange={(value) => setScopeSource((value ?? 'PROFILE') as WorkReportAuthorizationScopeSource)} disabled={!canManage} data={['PROFILE', 'DELEGATION']} />
            {scopeSource === 'DELEGATION' && level !== 'GROUP' ? <TextInput label="Company ID" value={companyId} onChange={(event) => setCompanyId(event.currentTarget.value)} disabled={!canManage} required /> : null}
            {scopeSource === 'DELEGATION' && level === 'DEPARTMENT' ? <TextInput label="Department ID" value={departmentId} onChange={(event) => setDepartmentId(event.currentTarget.value)} disabled={!canManage} required /> : null}
            <Checkbox label="Aggregate reports" checked={canAggregate} onChange={(event) => setCanAggregate(event.currentTarget.checked)} disabled={!canManage} />
            <Checkbox label="Submit aggregated reports" checked={canSubmit} onChange={(event) => setCanSubmit(event.currentTarget.checked)} disabled={!canManage || level === 'GROUP'} />
            <TextInput label="Reason" value={reason} onChange={(event) => setReason(event.currentTarget.value)} disabled={!canManage} />

            {canManage ? <Group justify="flex-end">
              {grant?.status === 'ACTIVE' ? <Button color="red" variant="light" loading={revokeMutation.isPending} onClick={() => revokeMutation.mutate()}>Revoke</Button> : null}
              {grant && grant.status !== 'ACTIVE' && grant.status !== 'REVOKED' ? <Button color="green" variant="light" loading={activateMutation.isPending} onClick={() => activateMutation.mutate()}>Activate</Button> : null}
              <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{grant ? 'Update draft' : 'Create draft'}</Button>
            </Group> : null}
            {historyQuery.data?.length ? <Text size="xs" c="dimmed">History entries: {historyQuery.data.length}</Text> : null}
          </Stack>
        )}
      </Modal>
    </Alert>
  );
}
