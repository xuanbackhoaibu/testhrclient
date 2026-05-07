import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  Progress,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { bulkProvisionFromEmployees } from '../auth-admin/authAdminApi';
import type {
  BulkProvisionFromEmployeesResult,
  BulkProvisionItemStatus,
} from '../auth-admin/authAdminTypes';
import type { Employee } from './employeeTypes';

interface Props {
  employees: Employee[];
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function statusBadge(status: BulkProvisionItemStatus) {
  const map: Record<BulkProvisionItemStatus, { color: string; label: string }> = {
    CREATED: { color: 'green', label: 'Đã tạo' },
    SKIPPED: { color: 'gray', label: 'Bỏ qua' },
    FAILED: { color: 'red', label: 'Thất bại' },
    INVALID: { color: 'orange', label: 'Không hợp lệ' },
  };
  const cfg = map[status] ?? { color: 'gray', label: status };
  return <Badge color={cfg.color} variant="light">{cfg.label}</Badge>;
}

function classifyEmployees(employees: Employee[]) {
  const valid: Employee[] = [];
  const invalid: Array<{ employee: Employee; reason: string }> = [];

  for (const emp of employees) {
    if (emp.authUserId) {
      invalid.push({ employee: emp, reason: 'Đã có tài khoản' });
    } else if (!emp.companyEmail && !emp.personalEmail) {
      invalid.push({ employee: emp, reason: 'Chưa có email' });
    } else if (!emp.employeeCode) {
      invalid.push({ employee: emp, reason: 'Thiếu mã nhân sự' });
    } else {
      valid.push(emp);
    }
  }

  return { valid, invalid };
}

export function BulkProvisionModal({ employees, opened, onClose, onSuccess }: Props) {
  const [sendOtp, setSendOtp] = useState(false);
  const [result, setResult] = useState<BulkProvisionFromEmployeesResult | null>(null);

  const { valid, invalid } = classifyEmployees(employees);

  const provision = useMutation({
    mutationFn: () =>
      bulkProvisionFromEmployees({
        employees: valid.map((emp) => ({
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
          email: (emp.companyEmail ?? emp.personalEmail)!,
          unitName: emp.unitName ?? undefined,
          departmentName: emp.departmentName ?? undefined,
          positionName: emp.positionName ?? undefined,
        })),
        sendOtp,
        skipExisting: true,
      }),
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
    },
    onError: (err: unknown) => {
      notifications.show({
        color: 'red',
        title: 'Cấp tài khoản hàng loạt thất bại',
        message: (err as { message?: string })?.message ?? 'Đã xảy ra lỗi.',
      });
    },
  });

  function handleClose() {
    setResult(null);
    provision.reset();
    onClose();
  }

  if (result) {
    const allResults = result.results;
    return (
      <Modal
        title="Kết quả cấp tài khoản hàng loạt"
        opened={opened}
        onClose={handleClose}
        size="xl"
      >
        <Stack gap="md">
          <Group gap="xl">
            <Stack gap={2} align="center">
              <Text size="xl" fw={700} c="green">{result.created}</Text>
              <Text size="xs" c="dimmed">Đã tạo</Text>
            </Stack>
            <Stack gap={2} align="center">
              <Text size="xl" fw={700} c="gray">{result.skipped}</Text>
              <Text size="xs" c="dimmed">Bỏ qua</Text>
            </Stack>
            <Stack gap={2} align="center">
              <Text size="xl" fw={700} c="red">{result.failed}</Text>
              <Text size="xs" c="dimmed">Thất bại</Text>
            </Stack>
            <Stack gap={2} align="center">
              <Text size="xl" fw={700}>{result.total}</Text>
              <Text size="xs" c="dimmed">Tổng</Text>
            </Stack>
          </Group>

          {result.created > 0 && (
            <Progress
              value={(result.created / result.total) * 100}
              color="green"
              size="sm"
            />
          )}

          <ScrollArea h={360}>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Mã NS</Table.Th>
                  <Table.Th>Họ tên</Table.Th>
                  <Table.Th>Trạng thái</Table.Th>
                  <Table.Th>Ghi chú</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {allResults.map((r) => (
                  <Table.Tr key={r.employeeId}>
                    <Table.Td>{r.employeeCode}</Table.Td>
                    <Table.Td>{r.fullName}</Table.Td>
                    <Table.Td>{statusBadge(r.status)}</Table.Td>
                    <Table.Td>
                      <Text size="xs" c={r.reason ? 'red' : 'dimmed'}>
                        {r.reason ?? (r.status === 'CREATED' ? 'Thành công' : '—')}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {invalid.map(({ employee: emp, reason }) => (
                  <Table.Tr key={emp.id}>
                    <Table.Td>{emp.employeeCode}</Table.Td>
                    <Table.Td>{emp.fullName}</Table.Td>
                    <Table.Td><Badge color="orange" variant="light">Bỏ qua (preview)</Badge></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{reason}</Text></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Group justify="flex-end">
            <Button onClick={handleClose}>Đóng</Button>
          </Group>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal
      title="Cấp tài khoản hàng loạt"
      opened={opened}
      onClose={handleClose}
      size="lg"
    >
      <Stack gap="md">
        <Group gap="xl">
          <Stack gap={2} align="center">
            <Text size="xl" fw={700}>{employees.length}</Text>
            <Text size="xs" c="dimmed">Đã chọn</Text>
          </Stack>
          <Stack gap={2} align="center">
            <Text size="xl" fw={700} c="green">{valid.length}</Text>
            <Text size="xs" c="dimmed">Hợp lệ (READY)</Text>
          </Stack>
          <Stack gap={2} align="center">
            <Text size="xl" fw={700} c="orange">{invalid.length}</Text>
            <Text size="xs" c="dimmed">Bỏ qua</Text>
          </Stack>
        </Group>

        {valid.length === 0 && (
          <Alert color="orange" title="Không có nhân sự hợp lệ">
            Tất cả nhân sự được chọn đều đã có tài khoản hoặc thiếu thông tin bắt buộc.
          </Alert>
        )}

        {invalid.length > 0 && (
          <Alert color="blue" title={`${invalid.length} nhân sự sẽ bị bỏ qua`}>
            <Stack gap={2}>
              {invalid.slice(0, 5).map(({ employee: emp, reason }) => (
                <Text size="xs" key={emp.id}>
                  {emp.employeeCode} — {emp.fullName}: <strong>{reason}</strong>
                </Text>
              ))}
              {invalid.length > 5 && (
                <Text size="xs" c="dimmed">...và {invalid.length - 5} nhân sự khác</Text>
              )}
            </Stack>
          </Alert>
        )}

        <Divider />

        <Title order={6}>Tùy chọn</Title>

        <Checkbox
          label="Gửi OTP / email kích hoạt cho toàn bộ"
          description="Chỉ áp dụng cho nhân sự có email"
          checked={sendOtp}
          onChange={(e) => setSendOtp(e.currentTarget.checked)}
        />

        <Alert color="blue" variant="light">
          Tài khoản sẽ được tạo ở trạng thái <strong>Hoạt động</strong>. Nhân sự đã có tài khoản sẽ được bỏ qua tự động.
          Mật khẩu ban đầu không hiển thị trong bulk — dùng chức năng Reset mật khẩu nếu cần.
        </Alert>

        <Divider />

        <Title order={6}>Preview danh sách ({valid.length} nhân sự sẽ được tạo)</Title>
        {valid.length > 0 && (
          <ScrollArea h={200}>
            <Table striped withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Mã NS</Table.Th>
                  <Table.Th>Họ tên</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Trạng thái</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {valid.map((emp) => (
                  <Table.Tr key={emp.id}>
                    <Table.Td>{emp.employeeCode}</Table.Td>
                    <Table.Td>{emp.fullName}</Table.Td>
                    <Table.Td>{emp.companyEmail ?? emp.personalEmail}</Table.Td>
                    <Table.Td><Badge color="green" variant="light">READY</Badge></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose}>Hủy</Button>
          <Button
            loading={provision.isPending}
            disabled={valid.length === 0}
            onClick={() => provision.mutate()}
          >
            Cấp tài khoản cho {valid.length} nhân sự
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
