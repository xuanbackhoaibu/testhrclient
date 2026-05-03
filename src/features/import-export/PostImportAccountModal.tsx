import { Alert, Checkbox, Modal, Select, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { bulkProvisionFromBatch } from '../auth-admin/authAdminApi';
import { useAvailableRoles } from '../auth-admin/useAvailableRoles';

interface Props {
  open: boolean;
  batchId: string;
  importedCount: number;
  onClose: () => void;
}

export function PostImportAccountModal({ open, batchId, importedCount, onClose }: Props) {
  const [createAccounts, setCreateAccounts] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [defaultRoles, setDefaultRoles] = useState<string[]>(['EMPLOYEE']);
  const { asSelectOptions: roleOptions } = useAvailableRoles();

  const provisionMutation = useMutation({
    mutationFn: () =>
      bulkProvisionFromBatch({
        batchId,
        defaultRoles,
        initialStatus: 'PENDING_ACTIVATION',
        sendActivationEmail: sendEmail,
      }),
    onSuccess: (result) => {
      const msg = `Đã tạo ${result.created}/${result.total} tài khoản.${result.failed ? ` Thất bại: ${result.failed}.` : ''}`;
      message.success(msg);
      onClose();
    },
    onError: (err: unknown) => {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 501) {
        message.warning('Tính năng tạo tài khoản hàng loạt chưa được hỗ trợ. Vui lòng tạo từng tài khoản thủ công trong tab Tài khoản.');
      } else {
        message.error((err as { message?: string })?.message ?? 'Tạo tài khoản thất bại.');
      }
    },
  });

  function handleOk() {
    if (!createAccounts) {
      onClose();
      return;
    }
    provisionMutation.mutate();
  }

  return (
    <Modal
      title="Import thành công"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={provisionMutation.isPending}
      okText={createAccounts ? 'Tạo tài khoản' : 'Đóng'}
      cancelText="Bỏ qua"
      cancelButtonProps={{ style: { display: createAccounts ? undefined : 'none' } }}
    >
      <Alert
        message={`Đã import ${importedCount} nhân sự mới thành công.`}
        type="success"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Checkbox
          checked={createAccounts}
          onChange={(e) => setCreateAccounts(e.target.checked)}
        >
          Tạo tài khoản cho nhân sự mới
        </Checkbox>

        {createAccounts && (
          <Space direction="vertical" style={{ width: '100%', paddingLeft: 24 }} size="small">
            <div>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Role mặc định
              </Typography.Text>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                value={defaultRoles}
                onChange={setDefaultRoles}
                options={roleOptions}
                placeholder="Chọn role mặc định"
              />
            </div>

            <Typography.Text type="secondary">
              Trạng thái khởi tạo: <strong>Chờ kích hoạt (PENDING)</strong>
            </Typography.Text>

            <Checkbox
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            >
              Gửi email kích hoạt
            </Checkbox>

            <Alert
              type="info"
              showIcon
              message="Chỉ nhân sự chưa có tài khoản mới được tạo. Nhân sự đã có tài khoản sẽ được bỏ qua."
            />
          </Space>
        )}
      </Space>
    </Modal>
  );
}
