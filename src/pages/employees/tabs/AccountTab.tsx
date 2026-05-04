import { Alert, Button, Descriptions, Modal, Popconfirm, Space, Tag, Typography, message } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  getAuthUserByEmployeeId,
  provisionFromEmployee,
  revokeSessions,
  sendActivation,
  updateAccountStatus,
} from '../../../features/auth-admin/authAdminApi';
import { ACCOUNT_STATUS_LABELS } from '../../../features/auth-admin/authAdminTypes';
import { HR_PERMISSIONS } from '../../../features/auth/permissions';
import { useAuth } from '../../../features/auth/useAuth';
import type { Employee } from '../../../features/employees/employeeTypes';
import { api } from '../../../shared/api/httpClient';
import { LoadingState } from '../../../shared/components/LoadingState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { formatDateTime } from '../../../shared/utils/date';

interface Props {
  employee: Employee;
}

function accountStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'PENDING_ACTIVATION': case 'INACTIVE': return 'warning';
    case 'SUSPENDED': case 'LOCKED': return 'orange';
    case 'DISABLED': case 'DEACTIVATED': return 'error';
    default: return 'default';
  }
}

export function AccountTab({ employee }: Props) {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const canRead = can('hr.account.read');
  const canCreate = can('hr.account.create');
  const canSendActivation = can('hr.account.reset_password');
  const canActivate = can('hr.account.restore');
  const canSuspend = can('hr.account.lock');
  const canUpdate = can('hr.account.update');

  const { data: authUser, isLoading, error, refetch } = useQuery({
    queryKey: ['auth-user-by-employee', employee.id],
    queryFn: () => getAuthUserByEmployeeId(employee.id),
    enabled: canRead && Boolean(employee.authUserId),
    retry: (failCount, err: unknown) =>
      failCount < 1 && (err as { statusCode?: number })?.statusCode !== 404,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auth-user-by-employee', employee.id] }),
      queryClient.invalidateQueries({ queryKey: ['employee-detail', employee.id] }),
    ]);
  };

  const provisionMutation = useMutation({
    mutationFn: async () => {
      const result = await provisionFromEmployee({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        email: employee.companyEmail ?? employee.personalEmail ?? '',
        unitCode: undefined,
        unitName: employee.unitName ?? undefined,
        departmentName: employee.departmentName ?? undefined,
        positionName: employee.positionName ?? undefined,
        sendActivationEmail: true,
      });
      await api.patch(`/employees/${employee.id}/auth-link`, {
        authUserId: result.authUserId,
        accountStatus: result.accountStatus,
      });
      return result;
    },
    onSuccess: async () => {
      message.success('Tạo tài khoản thành công. Email kích hoạt đã được gửi.');
      setCreateModalOpen(false);
      await invalidate();
    },
    onError: (err: unknown) => {
      message.error((err as { message?: string })?.message ?? 'Tạo tài khoản thất bại.');
    },
  });

  const sendActivationMutation = useMutation({
    mutationFn: () => sendActivation(authUser!.authUserId),
    onSuccess: async () => {
      message.success('Đã gửi email kích hoạt.');
      await invalidate();
    },
    onError: (err: unknown) =>
      message.error((err as { message?: string })?.message ?? 'Gửi email kích hoạt thất bại.'),
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      updateAccountStatus(authUser!.authUserId, {
        status: 'SUSPENDED',
        revokeSessions: true,
        reason: 'HR admin suspended',
      }),
    onSuccess: async () => {
      message.success('Đã tạm khóa tài khoản.');
      await invalidate();
    },
    onError: (err: unknown) =>
      message.error((err as { message?: string })?.message ?? 'Tạm khóa tài khoản thất bại.'),
  });

  const activateMutation = useMutation({
    mutationFn: () =>
      updateAccountStatus(authUser!.authUserId, {
        status: 'ACTIVE',
        reason: 'HR admin activated',
      }),
    onSuccess: async () => {
      message.success('Đã kích hoạt tài khoản.');
      await invalidate();
    },
    onError: (err: unknown) =>
      message.error((err as { message?: string })?.message ?? 'Kích hoạt tài khoản thất bại.'),
  });

  const disableMutation = useMutation({
    mutationFn: () =>
      updateAccountStatus(authUser!.authUserId, {
        status: 'DISABLED',
        revokeSessions: true,
        reason: 'HR admin disabled',
      }),
    onSuccess: async () => {
      message.success('Đã vô hiệu hóa tài khoản.');
      await invalidate();
    },
    onError: (err: unknown) =>
      message.error((err as { message?: string })?.message ?? 'Vô hiệu hóa tài khoản thất bại.'),
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: () => revokeSessions(authUser!.authUserId, 'HR admin revoke sessions'),
    onSuccess: async () => {
      message.success('Đã thu hồi tất cả phiên đăng nhập.');
      await invalidate();
    },
    onError: (err: unknown) =>
      message.error((err as { message?: string })?.message ?? 'Thu hồi session thất bại.'),
  });

  if (!canRead) {
    return <Alert message="Bạn không có quyền xem thông tin tài khoản nhân sự." type="info" showIcon />;
  }

  const hasAccount = Boolean(employee.authUserId);

  if (!hasAccount) {
    return (
      <div>
        <Alert
          message="Nhân sự chưa có tài khoản đăng nhập"
          description="Tạo tài khoản để cấp quyền truy cập vào hệ thống cho nhân sự này."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        {canCreate && (
          <>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              Tạo tài khoản
            </Button>

            <Modal
              title="Xác nhận tạo tài khoản"
              open={createModalOpen}
              onCancel={() => setCreateModalOpen(false)}
              onOk={() => provisionMutation.mutate()}
              confirmLoading={provisionMutation.isPending}
              okText="Tạo tài khoản & Gửi email kích hoạt"
              cancelText="Hủy"
            >
              <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Họ tên">{employee.fullName}</Descriptions.Item>
                <Descriptions.Item label="MNS">{employee.employeeCode}</Descriptions.Item>
                <Descriptions.Item label="Email">
                  {employee.companyEmail ?? employee.personalEmail ?? (
                    <Typography.Text type="danger">Chưa có email — tài khoản sẽ không nhận được email kích hoạt</Typography.Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Đơn vị">{employee.unitName ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="Phòng ban">{employee.departmentName ?? '-'}</Descriptions.Item>
              </Descriptions>
              <Typography.Text type="secondary">
                Tài khoản sẽ được tạo với trạng thái <strong>Chờ kích hoạt</strong>. Email kích hoạt sẽ được gửi đến địa chỉ email trên.
              </Typography.Text>
            </Modal>
          </>
        )}
      </div>
    );
  }

  if (isLoading) return <LoadingState />;

  if (error || !authUser) {
    return (
      <div>
        <Alert
          message="Auth User ID"
          description={<Typography.Text copyable>{employee.authUserId}</Typography.Text>}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <ErrorState
          title="Không thể tải thông tin tài khoản"
          description="Không thể kết nối đến auth service."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const accountStatus = authUser.accountStatus;
  const isSuspended = accountStatus === 'SUSPENDED' || accountStatus === 'LOCKED';
  const isDisabled = accountStatus === 'DISABLED' || accountStatus === 'DEACTIVATED';
  const isPending = accountStatus === 'PENDING_ACTIVATION' || accountStatus === 'INACTIVE';
  const isActive = accountStatus === 'ACTIVE';

  const anyBusy =
    provisionMutation.isPending ||
    sendActivationMutation.isPending ||
    suspendMutation.isPending ||
    activateMutation.isPending ||
    disableMutation.isPending ||
    revokeSessionsMutation.isPending;

  return (
    <div>
      <Descriptions column={{ xs: 1, md: 2, xl: 3 }} bordered style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Auth User ID">
          <Typography.Text copyable code>{authUser.authUserId}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Email đăng nhập">{authUser.email}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <Tag color={accountStatusColor(accountStatus)}>
            {ACCOUNT_STATUS_LABELS[accountStatus] ?? accountStatus}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Permission Version">{authUser.permissionVersion ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Token Version">{authUser.tokenVersion ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Hoạt động lần cuối">
          {authUser.lastSeen ? formatDateTime(authUser.lastSeen) : 'Chưa đăng nhập'}
        </Descriptions.Item>
      </Descriptions>

      <Space wrap>
        {canSendActivation && isPending && (
          <Popconfirm
            title="Gửi email kích hoạt?"
            description="Email kích hoạt sẽ được gửi đến địa chỉ email đã đăng ký."
            onConfirm={() => sendActivationMutation.mutate()}
            okText="Gửi"
            cancelText="Hủy"
          >
            <Button icon={<MailOutlined />} loading={sendActivationMutation.isPending} disabled={anyBusy}>
              Gửi email kích hoạt
            </Button>
          </Popconfirm>
        )}

        {canActivate && (isSuspended || isDisabled) && (
          <Popconfirm
            title="Kích hoạt tài khoản?"
            onConfirm={() => activateMutation.mutate()}
            okText="Kích hoạt"
            cancelText="Hủy"
          >
            <Button icon={<CheckCircleOutlined />} loading={activateMutation.isPending} disabled={anyBusy}>
              Kích hoạt tài khoản
            </Button>
          </Popconfirm>
        )}

        {canSuspend && isActive && (
          <Popconfirm
            title="Tạm khóa tài khoản?"
            description="Tài khoản sẽ bị khóa và tất cả phiên đăng nhập hiện tại sẽ bị thu hồi."
            onConfirm={() => suspendMutation.mutate()}
            okText="Tạm khóa"
            cancelText="Hủy"
          >
            <Button icon={<PauseCircleOutlined />} loading={suspendMutation.isPending} disabled={anyBusy}>
              Tạm khóa
            </Button>
          </Popconfirm>
        )}

        {canUpdate && !isDisabled && (
          <Popconfirm
            title="Vô hiệu hóa tài khoản?"
            description="Tài khoản sẽ bị vô hiệu hóa vĩnh viễn và không thể đăng nhập."
            onConfirm={() => disableMutation.mutate()}
            okText="Vô hiệu hóa"
            okButtonProps={{ danger: true }}
            cancelText="Hủy"
          >
            <Button
              danger
              icon={<CloseCircleOutlined />}
              loading={disableMutation.isPending}
              disabled={anyBusy}
            >
              Vô hiệu hóa
            </Button>
          </Popconfirm>
        )}

        {canUpdate && (
          <Popconfirm
            title="Thu hồi tất cả phiên đăng nhập?"
            description="Người dùng sẽ bị đăng xuất khỏi tất cả thiết bị."
            onConfirm={() => revokeSessionsMutation.mutate()}
            okText="Thu hồi"
            cancelText="Hủy"
          >
            <Button
              icon={<RollbackOutlined />}
              loading={revokeSessionsMutation.isPending}
              disabled={anyBusy}
            >
              Thu hồi sessions
            </Button>
          </Popconfirm>
        )}
      </Space>
    </div>
  );
}
