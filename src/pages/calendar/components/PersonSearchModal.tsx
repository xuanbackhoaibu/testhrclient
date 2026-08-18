import { useEffect, useMemo, useState } from 'react';
import { Avatar, Group, Loader, Modal, ScrollArea, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useEmployees } from '../../../features/employees/useEmployees';
import type { SelectedOwner } from '../../../features/calendar/useCalendarView';
import { useImeSafeSearch } from '../../../shared/hooks/useImeSafeSearch';
import styles from './PersonSearchModal.module.css';

interface PersonSearchModalProps {
  opened: boolean;
  onClose: () => void;
  selectedOwner: SelectedOwner | null;
  onSelect: (owner: SelectedOwner) => void;
}

/**
 * Modal "Tìm kiếm người để xem lịch" — mở khi bấm "Xem lịch người khác"
 * trong sidebar. Gõ tên/email/mã nhân viên để tìm, bấm vào kết quả để
 * chuyển sang xem lịch của người đó.
 */
export function PersonSearchModal({ opened, onClose, selectedOwner, onSelect }: PersonSearchModalProps) {
  const [search, setSearch] = useState('');
  const searchInput = useImeSafeSearch({ value: search, onSearch: setSearch });

  // Reset ô tìm kiếm mỗi lần mở lại modal.
  useEffect(() => {
    if (opened) {
      searchInput.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const { data: employeesData, isLoading, isFetching } = useEmployees({
    search: search || undefined,
    page: 1,
    pageSize: 20,
  });

  const employees = useMemo(() => employeesData?.data ?? [], [employeesData]);

  const handleSelect = (owner: SelectedOwner) => {
    onSelect(owner);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Tìm kiếm người để xem lịch"
      centered
      size="md"
      radius="md"
    >
      <Stack gap="md">
        <TextInput
          placeholder="Nhập tên, email hoặc mã nhân viên..."
          leftSection={<IconSearch size={16} />}
          size="md"
          autoFocus
          {...searchInput.inputProps}
        />

        {!searchInput.inputValue ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            Nhập tên, email hoặc mã nhân viên để tìm kiếm
          </Text>
        ) : isLoading || isFetching ? (
          <Stack align="center" py="lg">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Đang tìm kiếm...
            </Text>
          </Stack>
        ) : employees.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            Không tìm thấy nhân viên phù hợp
          </Text>
        ) : (
          <ScrollArea.Autosize mah={340} type="hover">
            <Stack gap={4}>
              {employees.map((emp) => {
                const isSelected = selectedOwner?.id === emp.id;
                return (
                  <UnstyledButton
                    key={emp.id}
                    className={styles.resultItem}
                    data-selected={isSelected || undefined}
                    onClick={() =>
                      handleSelect({
                        id: emp.id,
                        fullName: emp.fullName,
                        employeeCode: emp.employeeCode,
                      })
                    }
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Avatar size="sm" radius="xl" color={isSelected ? 'white' : 'blue'} style={{ flexShrink: 0 }}>
                        {emp.fullName?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                        <Text size="sm" fw={500} truncate>
                          {emp.fullName}
                        </Text>
                        <Text size="xs" c={isSelected ? 'blue.1' : 'dimmed'} truncate>
                          {[emp.employeeCode, emp.companyEmail ?? emp.personalEmail]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </Stack>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Stack>
    </Modal>
  );
}
