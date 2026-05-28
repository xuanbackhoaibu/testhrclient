import { useMemo } from 'react';
import {
  Avatar,
  Button,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  ScrollArea,
} from '@mantine/core';
import { IconSearch, IconX, IconUser } from '@tabler/icons-react';
import { useState } from 'react';
import { useEmployees } from '../../../features/employees/useEmployees';
import type { SelectedOwner } from '../../../features/calendar/useCalendarView';
import { useCalendarOwner } from '../../../features/calendar/CalendarContext';
import styles from './CalendarSidebar.module.css';

export function CalendarSidebar() {
  const { selectedOwner, selectOwner, isViewingOthers } = useCalendarOwner();
  const [search, setSearch] = useState('');

  const { data: employeesData, isLoading } = useEmployees({
    search: search || undefined,
    page: 1,
    pageSize: 100,
  });

  const employees = useMemo(() => employeesData?.data ?? [], [employeesData]);

  const handleSelectUser = (owner: SelectedOwner | null) => {
    selectOwner(owner);
  };

  return (
    <aside className={styles.sidebar}>
      <Stack gap="sm" h="100%">
        {/* My Calendar */}
        <Button
          variant={!isViewingOthers ? 'filled' : 'light'}
          color={!isViewingOthers ? 'blue' : 'gray'}
          fullWidth
          justify="flex-start"
          leftSection={<IconUser size={16} />}
          onClick={() => handleSelectUser(null)}
        >
          Lịch của tôi
        </Button>

        <Divider label="Nhân viên" labelPosition="left" />

        {/* Search */}
        <TextInput
          placeholder="Tìm kiếm nhân viên..."
          leftSection={<IconSearch size={14} />}
          rightSection={
            search ? (
              <IconX
                size={14}
                style={{ cursor: 'pointer' }}
                onClick={() => setSearch('')}
              />
            ) : null
          }
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          size="xs"
        />

        {/* Employee List with scroll */}
        <ScrollArea className={styles.employeeScroll} type="hover">
          <Stack gap={4}>
            {isLoading ? (
              <Stack align="center" py="md">
                <Loader size="sm" />
                <Text size="xs" c="dimmed">Đang tải...</Text>
              </Stack>
            ) : employees.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="md">
                {search ? 'Không tìm thấy nhân viên' : 'Không có nhân viên'}
              </Text>
            ) : (
              employees.map((emp) => (
                <Button
                  key={emp.id}
                  variant={selectedOwner?.id === emp.id ? 'filled' : 'subtle'}
                  color={selectedOwner?.id === emp.id ? 'blue' : 'gray'}
                  fullWidth
                  justify="flex-start"
                  onClick={() =>
                    handleSelectUser({
                      id: emp.id,
                      fullName: emp.fullName,
                      employeeCode: emp.employeeCode,
                    })
                  }
                  className={styles.employeeButton}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Avatar size="sm" radius="xl" color="blue">
                      {emp.fullName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Stack gap={0} style={{ overflow: 'hidden' }}>
                      <Text size="sm" lineClamp={1} fw={selectedOwner?.id === emp.id ? 600 : 400}>
                        {emp.fullName}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {emp.employeeCode}
                      </Text>
                    </Stack>
                  </Group>
                </Button>
              ))
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </aside>
  );
}
