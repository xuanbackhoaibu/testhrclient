import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';

import { bulkClearEmployeeBioTimeCode } from './employeesApi';
import {
  splitBioTimeClearSelection,
  type BulkClearBioTimeItemResult,
} from './bulkClearBioTimeCode';
import type { Employee } from './employeeTypes';

interface Props {
  employees: Employee[];
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkClearBioTimeCodeModal({
  employees,
  opened,
  onClose,
  onSuccess,
}: Props) {
  const [results, setResults] = useState<BulkClearBioTimeItemResult[] | null>(null);
  const { clearable, alreadyEmpty } = splitBioTimeClearSelection(employees);

  const clearMutation = useMutation({
    mutationFn: () => bulkClearEmployeeBioTimeCode(clearable),
    onSuccess: (data) => {
      setResults(data);
      const failed = data.filter((item) => item.status === 'FAILED').length;
      notifications.show({
        color: failed > 0 ? 'orange' : 'teal',
        title: 'Hủy mã chấm công',
        message:
          failed > 0
            ? `Đã hủy ${data.length - failed}/${data.length} mã, ${failed} dòng lỗi.`
            : `Đã hủy mã chấm công của ${data.length} nhân sự.`,
      });
      onSuccess();
    },
    onError: (error: unknown) => {
      notifications.show({
        color: 'red',
        title: 'Hủy mã chấm công thất bại',
        message: (error as { message?: string })?.message ?? 'Đã xảy ra lỗi.',
      });
    },
  });

  function handleClose() {
    setResults(null);
    clearMutation.reset();
    onClose();
  }

  if (results) {
    const failed = results.filter((item) => item.status === 'FAILED');
    return (
      <Modal title="Kết quả hủy mã chấm công" opened={opened} onClose={handleClose} size="lg">
        <Stack gap="md">
          <Group gap="xl">
            <Stack gap={2} align="center">
              <Text size="xl" fw={700} c="teal">
                {results.length - failed.length}
              </Text>
              <Text size="xs" c="dimmed">Đã hủy</Text>
            </Stack>
            <Stack gap={2} align="center">
              <Text size="xl" fw={700} c={failed.length > 0 ? 'red' : undefined}>
                {failed.length}
              </Text>
              <Text size="xs" c="dimmed">Lỗi</Text>
            </Stack>
          </Group>

          <ScrollArea.Autosize mah={320}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Mã NS</Table.Th>
                  <Table.Th>Họ tên</Table.Th>
                  <Table.Th>Mã chấm công cũ</Table.Th>
                  <Table.Th>Kết quả</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {results.map((item) => (
                  <Table.Tr key={item.employeeId}>
                    <Table.Td>{item.employeeCode}</Table.Td>
                    <Table.Td>{item.fullName}</Table.Td>
                    <Table.Td>{item.previousCode || '—'}</Table.Td>
                    <Table.Td>
                      {item.status === 'CLEARED' ? (
                        <Badge color="teal" variant="light">Đã hủy</Badge>
                      ) : (
                        <Badge color="red" variant="light" title={item.error}>
                          Lỗi
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>

          <Group justify="flex-end">
            <Button onClick={handleClose}>Đóng</Button>
          </Group>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal title="Hủy mã chấm công" opened={opened} onClose={handleClose} size="lg">
      <Stack gap="md">
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />}>
          Sau khi hủy, nhân sự không còn liên kết với máy chấm công nên{' '}
          <b>dữ liệu quẹt thẻ mới sẽ không tự vào bảng công</b>. Dữ liệu chấm công
          đã map trước đó vẫn giữ nguyên, không bị xóa.
        </Alert>

        {clearable.length === 0 ? (
          <Text size="sm">
            Không có dòng nào để hủy — các nhân sự đang chọn đều chưa gán mã chấm công.
          </Text>
        ) : (
          <>
            <Text size="sm">
              Sẽ hủy mã chấm công của <b>{clearable.length}</b> nhân sự:
            </Text>
            <ScrollArea.Autosize mah={280}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Mã NS</Table.Th>
                    <Table.Th>Họ tên</Table.Th>
                    <Table.Th>Mã chấm công</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {clearable.map((employee) => (
                    <Table.Tr key={employee.id}>
                      <Table.Td>{employee.employeeCode}</Table.Td>
                      <Table.Td>{employee.fullName}</Table.Td>
                      <Table.Td>
                        <Text size="sm" c="blue">{employee.biotimeEmployeeCode}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </>
        )}

        {alreadyEmpty.length > 0 && (
          <Text size="xs" c="dimmed">
            Bỏ qua {alreadyEmpty.length} nhân sự vốn chưa có mã chấm công.
          </Text>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose} disabled={clearMutation.isPending}>
            Đóng
          </Button>
          <Button
            color="red"
            loading={clearMutation.isPending}
            disabled={clearable.length === 0}
            onClick={() => clearMutation.mutate()}
          >
            Hủy mã chấm công ({clearable.length})
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
