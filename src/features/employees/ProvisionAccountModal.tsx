import {
  Alert,
  Button,
  Checkbox,
  Code,
  CopyButton,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { provisionFromEmployee } from '../auth-admin/authAdminApi';
import type { ProvisionFromEmployeeResult } from '../auth-admin/authAdminTypes';
import type { Employee } from './employeeTypes';
import { api } from '../../shared/api/httpClient';
import {
  DEFAULT_EMPLOYEE_PASSWORD,
  FORCE_CHANGE_PASSWORD_NOTICE,
} from '../../shared/constants/account';

interface Props {
  employee: Employee;
  opened: boolean;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <Text size="sm" c="dimmed" w={120} style={{ flexShrink: 0 }}>{label}</Text>
      <Text size="sm">{value ?? <Text span c="dimmed">—</Text>}</Text>
    </Group>
  );
}

export function ProvisionAccountModal({ employee, opened, onClose }: Props) {
  const queryClient = useQueryClient();
  const [sendOtp, setSendOtp] = useState(false);
  const [result, setResult] = useState<ProvisionFromEmployeeResult | null>(null);

  const email = employee.companyEmail ?? employee.personalEmail ?? '';
  const hasEmail = Boolean(email);

  const provision = useMutation({
    mutationFn: () =>
      provisionFromEmployee({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        email: email || null,
        unitName: employee.unitName ?? undefined,
        departmentName: employee.departmentName ?? undefined,
        positionName: employee.positionName ?? undefined,
        sendActivationEmail: sendOtp,
      }),
    onSuccess: async (data) => {
      setResult(data);
      await api.patch(`/employees/${employee.id}/auth-link`, {
        authUserId: data.authUserId,
        accountStatus: data.accountStatus,
      });
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['employee-detail', employee.id] });
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        title: 'Cấp tài khoản thất bại',
        message: (err as { message?: string })?.message ?? 'Đã xảy ra lỗi.',
      });
    },
  });

  function handleClose() {
    setResult(null);
    provision.reset();
    onClose();
  }

  const expectedUsername = employee.employeeCode;

  return (
    <Modal
      title={result ? 'Cấp tài khoản thành công' : 'Cấp tài khoản đăng nhập'}
      opened={opened}
      onClose={handleClose}
      size="md"
    >
      {!result ? (
        <Stack gap="sm">
          <Stack gap={4}>
            <InfoRow label="Họ tên" value={employee.fullName} />
            <InfoRow label="Mã nhân sự" value={employee.employeeCode} />
            <InfoRow label="Email" value={email || 'Chưa có email'} />
            <InfoRow label="Đơn vị" value={employee.unitName} />
            <InfoRow label="Phòng ban" value={employee.departmentName} />
            <InfoRow label="Chức vụ" value={employee.positionName} />
          </Stack>

          <Divider />

          <Stack gap={4}>
            <InfoRow label="Tài khoản đăng nhập" value={expectedUsername} />
            <InfoRow label="Mật khẩu mặc định" value={DEFAULT_EMPLOYEE_PASSWORD} />
            <Text size="xs" c="dimmed">
              Tài khoản đăng nhập là mã nhân viên. Tài khoản mới được tạo với mật khẩu mặc định. {FORCE_CHANGE_PASSWORD_NOTICE}
            </Text>
          </Stack>

          {!hasEmail && (
            <Alert color="blue" title="Không có email (không bắt buộc)">
              Nhân sự chưa có email — vẫn cấp được tài khoản. Tài khoản đăng nhập là mã nhân viên và sẽ ở trạng thái Hoạt động ngay. (Không thể gửi OTP kích hoạt khi chưa có email.)
            </Alert>
          )}

          <Checkbox
            label="Gửi OTP / email kích hoạt sau khi tạo"
            checked={sendOtp}
            disabled={!hasEmail}
            onChange={(e) => setSendOtp(e.currentTarget.checked)}
          />

          {!sendOtp && (
            <Alert color="blue" variant="light">
              Tài khoản sẽ ở trạng thái <strong>Hoạt động</strong> ngay sau khi tạo với mật khẩu mặc định <strong>{DEFAULT_EMPLOYEE_PASSWORD}</strong>.
            </Alert>
          )}

          {sendOtp && (
            <Alert color="blue" variant="light">
              Tài khoản sẽ được tạo và email kích hoạt sẽ được gửi đến <strong>{email}</strong>.
            </Alert>
          )}

          <Text size="xs" c="dimmed">
            Nhân sự sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
          </Text>

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={handleClose}>Hủy</Button>
            <Button
              loading={provision.isPending}
              disabled={!hasEmail && sendOtp}
              onClick={() => provision.mutate()}
            >
              Cấp tài khoản
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
          {result.status === 'created' ? (
            <Alert color="green" title="Tài khoản đã được tạo thành công">
              Nhân sự <strong>{employee.fullName}</strong> đã có tài khoản đăng nhập.
            </Alert>
          ) : (
            <Alert color="blue" title="Nhân sự đã có tài khoản">
              Nhân sự <strong>{employee.fullName}</strong> đã có tài khoản đăng nhập từ trước.{' '}
              {result.status === 'updated' && 'Đã đồng bộ email/thông tin từ HRM. '}
              Không tạo trùng và không thay đổi mật khẩu hiện tại.
            </Alert>
          )}

          <Stack gap={4}>
            <InfoRow label="Tài khoản đăng nhập" value={result.loginAccount ?? expectedUsername} />
            <InfoRow label="Email" value={result.email ?? 'Chưa có'} />
          </Stack>

          {result.status === 'created' && (
            <>
              <Divider label="Mật khẩu mặc định" labelPosition="center" />
              <Alert color="orange" title="Bàn giao mật khẩu mặc định cho nhân sự">
                Tài khoản được tạo với mật khẩu mặc định cố định. {FORCE_CHANGE_PASSWORD_NOTICE}
              </Alert>
              <Group gap="xs" align="center">
                <TextInput
                  value={DEFAULT_EMPLOYEE_PASSWORD}
                  readOnly
                  style={{ flex: 1 }}
                  styles={{ input: { fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' } }}
                />
                <CopyButton value={DEFAULT_EMPLOYEE_PASSWORD}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Đã copy' : 'Copy mật khẩu'}>
                      <Button
                        variant={copied ? 'filled' : 'light'}
                        color={copied ? 'teal' : 'blue'}
                        onClick={copy}
                        leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      >
                        {copied ? 'Đã copy' : 'Copy'}
                      </Button>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </>
          )}

          {sendOtp && result.status === 'created' && result.email && (
            <Alert color="blue">
              Email kích hoạt đã được gửi đến <strong>{result.email}</strong>.
            </Alert>
          )}

          <Text size="xs" c="dimmed">
            Auth User ID: <Code>{result.authUserId}</Code>
          </Text>

          <Group justify="flex-end">
            <Button onClick={handleClose}>Đóng</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
