import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Group,
  Loader,
  Pill,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

import { useEmployees } from '../../../features/employees/useEmployees';
import { useImeSafeSearch } from '../../../shared/hooks/useImeSafeSearch';

export interface SelectedParticipant {
  id: string;
  fullName: string;
  employeeCode: string;
  departmentName?: string | null;
}

interface ParticipantPickerProps {
  value: SelectedParticipant[];
  onChange: (next: SelectedParticipant[]) => void;
  /** Employee id to hide from results (usually the organizer/owner). */
  excludeEmployeeId?: string | null;
}

export function ParticipantPicker({
  value,
  onChange,
  excludeEmployeeId,
}: ParticipantPickerProps) {
  const [search, setSearch] = useState('');
  const searchInput = useImeSafeSearch({ value: search, onSearch: setSearch });

  const { data, isLoading, isFetching } = useEmployees({
    search: search.trim() || undefined,
    page: 1,
    pageSize: 20,
  });

  const selectedIds = useMemo(
    () => new Set(value.map((p) => p.id)),
    [value],
  );

  const results = useMemo(() => {
    const list = data?.data ?? [];
    return list.filter(
      (emp) => emp.id !== excludeEmployeeId && !selectedIds.has(emp.id),
    );
  }, [data?.data, excludeEmployeeId, selectedIds]);

  const add = (emp: SelectedParticipant) => {
    if (selectedIds.has(emp.id)) return;
    onChange([...value, emp]);
    searchInput.clear();
  };

  const remove = (id: string) => {
    onChange(value.filter((p) => p.id !== id));
  };

  const showDropdown = searchInput.inputValue.length > 0;

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Thành phần tham gia
        {value.length > 0 && (
          <Badge ml="xs" variant="light" size="sm">
            {value.length}
          </Badge>
        )}
      </Text>

      {/* Selected chips */}
      {value.length > 0 && (
        <Group gap={6}>
          {value.map((p) => (
            <Pill
              key={p.id}
              withRemoveButton
              onRemove={() => remove(p.id)}
              size="md"
            >
              {p.fullName} · {p.employeeCode}
            </Pill>
          ))}
        </Group>
      )}

      <TextInput
        placeholder="Tìm theo tên, mã NV, email, phòng ban..."
        leftSection={<IconSearch size={14} />}
        rightSection={
          isFetching ? (
            <Loader size={14} />
          ) : searchInput.inputValue ? (
            <IconX
              size={14}
              style={{ cursor: 'pointer' }}
              onClick={() => searchInput.clear()}
            />
          ) : null
        }
        {...searchInput.inputProps}
      />

      {showDropdown && (
        <ScrollArea.Autosize
          mah={200}
          type="hover"
          style={{
            border: '1px solid var(--mantine-color-gray-3)',
            borderRadius: 'var(--mantine-radius-sm)',
          }}
        >
          {isLoading ? (
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          ) : results.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" py="md">
              Không tìm thấy nhân sự
            </Text>
          ) : (
            <Stack gap={0}>
              {results.map((emp) => (
                <UnstyledButton
                  key={emp.id}
                  onClick={() =>
                    add({
                      id: emp.id,
                      fullName: emp.fullName,
                      employeeCode: emp.employeeCode,
                      departmentName: emp.departmentName,
                    })
                  }
                  style={{ padding: '8px 12px' }}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Avatar size="sm" radius="xl" color="hacomRed">
                      {emp.fullName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Text size="sm" lineClamp={1}>
                        {emp.fullName}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {emp.employeeCode}
                        {emp.departmentName ? ` · ${emp.departmentName}` : ''}
                      </Text>
                    </Stack>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>
      )}
    </Stack>
  );
}
