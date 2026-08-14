import { useMemo, useState } from 'react';
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
import { IconSearch, IconX, IconCalendar } from '@tabler/icons-react';
import { useEmployees } from '../../../features/employees/useEmployees';
import type { SelectedOwner } from '../../../features/calendar/useCalendarView';
import { useCalendarOwner } from '../../../features/calendar/CalendarContext';
import { useImeSafeSearch } from '../../../shared/hooks/useImeSafeSearch';
import styles from './CalendarSidebar.module.css';

export function CalendarSidebar() {
  const { selectedOwner, selectOwner, isViewingOthers } = useCalendarOwner();
  const [search, setSearch] = useState('');
  const searchInput = useImeSafeSearch({ value: search, onSearch: setSearch });

  const { data: employeesData, isLoading } = useEmployees({
    search: search || undefined,
    page: 1,
    pageSize: 100,
  });

  const employees = useMemo(() => employeesData?.data ?? [], [employeesData]);

  const handleSelectUser = (owner: SelectedOwner | null) => {
    selectOwner(owner);
  };

  const displayName = selectedOwner?.fullName ?? selectedOwner?.employeeCode ?? 'N/A';

  return (
    <aside className={styles.sidebar}>
      <Stack gap="sm" h="100%">
        {/* My Calendar button — always visible; active only when not viewing others */}
        <Button
          variant={!isViewingOthers ? 'filled' : 'subtle'}
          color={!isViewingOthers ? 'blue' : 'gray'}
          fullWidth
          justify="flex-start"
          leftSection={<IconCalendar size={16} />}
          onClick={() => handleSelectUser(null)}
        >
          Lịch của tôi
        </Button>

        {/* "Currently viewing" card — shown only when viewing another person */}
        {isViewingOthers && selectedOwner && (
          <>
            <Divider label="Đang xem" labelPosition="left" />
            <div className={styles.viewingCard}>
              <Avatar size="sm" radius="xl" color="hacomRed" style={{ flexShrink: 0 }}>
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
              <div className={styles.viewingCardInfo}>
                <div className={styles.viewingCardLabel}>Lịch đang xem</div>
                <div className={styles.viewingCardName} title={displayName}>
                  {displayName}
                </div>
                {selectedOwner.employeeCode && (
                  <div className={styles.viewingCardSub} title={selectedOwner.employeeCode}>
                    {selectedOwner.employeeCode}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.viewingCardClose}
                title="Về lịch của tôi"
                onClick={() => handleSelectUser(null)}
              >
                <IconX size={14} />
              </button>
            </div>
          </>
        )}

        <Divider
          label={isViewingOthers ? 'Chọn người khác' : 'Nhân viên'}
          labelPosition="left"
        />

        {/* Search */}
        <TextInput
          placeholder="Tìm kiếm nhân viên..."
          leftSection={<IconSearch size={14} />}
          rightSection={
            searchInput.inputValue ? (
              <IconX
                size={14}
                style={{ cursor: 'pointer' }}
                onClick={() => searchInput.clear()}
              />
            ) : null
          }
          {...searchInput.inputProps}
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
                {searchInput.inputValue ? 'Không tìm thấy nhân viên' : 'Không có nhân viên'}
              </Text>
            ) : (
              employees.map((emp) => {
                const isSelected = selectedOwner?.id === emp.id;
                return (
                  <Button
                    key={emp.id}
                    variant={isSelected ? 'filled' : 'subtle'}
                    color={isSelected ? 'blue' : 'gray'}
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
                    leftSection={
                      <Avatar size="xs" radius="xl" color={isSelected ? 'white' : 'hacomRed'} style={{ flexShrink: 0 }}>
                        {emp.fullName?.charAt(0).toUpperCase()}
                      </Avatar>
                    }
                  >
                    <Group gap={0} wrap="nowrap" className={styles.employeeRow}>
                      <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                        <span
                          className={styles.employeeName}
                          title={emp.fullName}
                          style={{ fontWeight: isSelected ? 600 : 400 }}
                        >
                          {emp.fullName}
                        </span>
                        <span className={styles.employeeSub} title={emp.employeeCode}>
                          {emp.employeeCode}
                        </span>
                      </Stack>
                    </Group>
                  </Button>
                );
              })
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </aside>
  );
}
