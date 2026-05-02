import { Alert, Button, Descriptions, List, Modal, Popconfirm, Select, Space, Spin, Tag, Typography, message } from 'antd';
import { ExclamationCircleOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  assignPermissions,
  assignRoles,
  getEffectivePermissions,
} from '../../../features/auth-admin/authAdminApi';
import { SENSITIVE_ROLES } from '../../../features/auth-admin/authAdminTypes';
import type { Employee } from '../../../features/employees/employeeTypes';
import { ErrorState } from '../../../shared/components/ErrorState';

interface Props {
  employee: Employee;
  canManage: boolean;
}

const AVAILABLE_ROLES = [
  { label: 'Employee', value: 'EMPLOYEE' },
  { label: 'HR Admin', value: 'HR_ADMIN' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Ban lãnh đạo', value: 'BAN_LANH_DAO' },
  { label: 'Ban lãnh đạo đơn vị', value: 'BAN_LANH_DAO_DON_VI' },
  { label: 'Super Admin ⚠️', value: 'SUPER_ADMIN' },
];

export function AccessTab({ employee, canManage }: Props) {
  const queryClient = useQueryClient();
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permInput, setPermInput] = useState('');

  const authUserId = employee.authUserId;

  const {
    data: effectivePerms,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['effective-permissions', authUserId],
    queryFn: () => getEffectivePermissions(authUserId!),
    enabled: canManage && Boolean(authUserId),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['effective-permissions', authUserId] });
  };

  const assignRolesMutation = useMutation({
    mutationFn: (roles: string[]) => assignRoles(authUserId!, { roles, reason: 'HR admin assigned roles' }),
    onSuccess: async () => {
      message.success('Đã cập nhật roles.');
      setRoleModalOpen(false);
      await invalidate();
    },
    onError: (err: any) => message.error(err?.message ?? 'Cập nhật role thất bại.'),
  });

  const assignPermsMutation = useMutation({
    mutationFn: (perms: string[]) => assignPermissions(authUserId!, { permissions: perms, reason: 'HR admin assigned permissions' }),
    onSuccess: async () => {
      message.success('Đã cập nhật permissions.');
      setPermModalOpen(false);
      await invalidate();
    },
    onError: (err: any) => message.error(err?.message ?? 'Cập nhật permission thất bại.'),
  });

  if (!canManage) {
    return <Alert message="Bạn không có quyền quản lý quyền truy cập nhân sự." type="info" showIcon />;
  }

  if (!authUserId) {
    return <Alert message="Nhân sự chưa có tài khoản. Vui lòng tạo tài khoản trước." type="warning" showIcon />;
  }

  if (isLoading) return <Spin style={{ padding: 32, display: 'block' }} />;

  if (error || !effectivePerms) {
    return <ErrorState title="Không thể tải thông tin quyền" onRetry={() => void refetch()} />;
  }

  const openRoleModal = () => {
    setSelectedRoles([...(effectivePerms.roles ?? [])]);
    setRoleModalOpen(true);
  };

  const openPermModal = () => {
    setSelectedPerms([...(effectivePerms.directPermissions ?? [])]);
    setPermInput('');
    setPermModalOpen(true);
  };

  const hasSensitive = selectedRoles.some((r) => SENSITIVE_ROLES.has(r));

  return (
    <div>
      <Descriptions column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Permission Version">{effectivePerms.permissionVersion ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Token Version">{effectivePerms.tokenVersion ?? '-'}</Descriptions.Item>
      </Descriptions>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>Roles</Typography.Title>
            {canManage && (
              <Button size="small" icon={<PlusOutlined />} onClick={openRoleModal}>
                Cập nhật
              </Button>
            )}
          </Space>
          <Space wrap>
            {effectivePerms.roles.length === 0 ? (
              <Typography.Text type="secondary">Chưa có role nào</Typography.Text>
            ) : (
              effectivePerms.roles.map((r) => (
                <Tag
                  key={r}
                  color={SENSITIVE_ROLES.has(r) ? 'red' : 'blue'}
                  icon={SENSITIVE_ROLES.has(r) ? <ExclamationCircleOutlined /> : undefined}
                >
                  {r}
                </Tag>
              ))
            )}
          </Space>
        </div>

        <div>
          <Space style={{ marginBottom: 8 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>Quyền trực tiếp</Typography.Title>
            {canManage && (
              <Button size="small" icon={<PlusOutlined />} onClick={openPermModal}>
                Cập nhật
              </Button>
            )}
          </Space>
          {effectivePerms.directPermissions.length === 0 ? (
            <Typography.Text type="secondary">Không có quyền trực tiếp</Typography.Text>
          ) : (
            <Space wrap>
              {effectivePerms.directPermissions.map((p) => (
                <Tag key={p} color="cyan" icon={<SafetyCertificateOutlined />}>{p}</Tag>
              ))}
            </Space>
          )}
        </div>

        <div>
          <Typography.Title level={5}>Effective Permissions</Typography.Title>
          {effectivePerms.effectivePermissions.length === 0 ? (
            <Typography.Text type="secondary">Không có quyền hiệu lực nào</Typography.Text>
          ) : (
            <List
              size="small"
              bordered
              dataSource={effectivePerms.effectivePermissions.sort()}
              renderItem={(perm) => (
                <List.Item>
                  <Typography.Text code>{perm}</Typography.Text>
                </List.Item>
              )}
              style={{ maxHeight: 320, overflowY: 'auto' }}
            />
          )}
        </div>
      </Space>

      <Modal
        title="Cập nhật Roles"
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={() => assignRolesMutation.mutate(selectedRoles)}
        confirmLoading={assignRolesMutation.isPending}
        okText="Lưu"
        cancelText="Hủy"
      >
        {hasSensitive && (
          <Alert
            message="Cảnh báo: Role nhạy cảm"
            description="Bạn đang gán role có quyền cao. Thao tác này chỉ dành cho superadmin."
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Chọn roles"
          value={selectedRoles}
          onChange={setSelectedRoles}
          options={AVAILABLE_ROLES}
        />
      </Modal>

      <Modal
        title="Cập nhật Permissions trực tiếp"
        open={permModalOpen}
        onCancel={() => setPermModalOpen(false)}
        onOk={() => assignPermsMutation.mutate(selectedPerms)}
        confirmLoading={assignPermsMutation.isPending}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Nhập permission key (ví dụ: hr.employee.read), nhấn Enter để thêm.
        </Typography.Paragraph>
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="Nhập permission key và nhấn Enter"
          value={selectedPerms}
          onChange={setSelectedPerms}
          tokenSeparators={[',']}
        />
      </Modal>
    </div>
  );
}
