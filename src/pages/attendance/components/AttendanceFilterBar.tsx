import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Group, Select, Stack, TextInput } from '@mantine/core';
import { IconRefresh, IconSearch, IconX } from '@tabler/icons-react';
import { useBioTimeDepartments } from '../../../features/attendance/useAttendanceSync';
import { AttendanceDateFilter } from './AttendanceDateFilter';
import type { AttendanceDateFilterValue } from './AttendanceDateFilter.types';
import styles from './AttendanceFilterBar.module.css';

export interface AttendanceFilters {
  search: string;
  date: string;
  from: string;
  to: string;
  status: string;
  mappingStatus: string;
  biotimeDepartmentId: number | null;
}

interface AttendanceFilterBarProps {
  filters: AttendanceFilters;
  onChange: (filters: AttendanceFilters) => void;
  onSync: () => void;
  onOpenMapping?: () => void;
  isSyncing: boolean;
  maySync: boolean;
  unmappedConflictCount?: number;
}

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Đủ công' },
  { value: 'LATE', label: 'Đi muộn' },
  { value: 'ABSENT', label: 'Vắng' },
  { value: 'SINGLE_PUNCH', label: '1 lần' },
  { value: 'UNKNOWN', label: 'Không rõ' },
];

const MAPPING_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'MAPPED', label: 'Đã map' },
  { value: 'AUTO_MAPPED', label: 'Tự map' },
  { value: 'UNMAPPED', label: 'Chưa map' },
  { value: 'CONFLICT', label: 'Trùng mã' },
];

const DEFAULT_FILTERS: AttendanceFilters = {
  search: '',
  date: '',
  from: '',
  to: '',
  status: '',
  mappingStatus: '',
  biotimeDepartmentId: null,
};

function countActiveFilters(f: AttendanceFilters): number {
  return [
    f.search,
    f.date,
    f.from,
    f.to,
    f.status,
    f.mappingStatus,
    f.biotimeDepartmentId,
  ].filter(Boolean).length;
}

export function AttendanceFilterBar({
  filters,
  onChange,
  onSync,
  onOpenMapping,
  isSyncing,
  maySync,
  unmappedConflictCount = 0,
}: AttendanceFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  // Derive date filter value from filters
  const dateFilterValue: AttendanceDateFilterValue = useMemo(() => {
    if (filters.from || filters.to) {
      return { mode: 'range', from: filters.from, to: filters.to };
    }
    return { mode: 'date', date: filters.date };
  }, [filters.date, filters.from, filters.to]);

  // Fetch departments for filter dropdown
  const { data: departmentsData } = useBioTimeDepartments({
    isActive: true,
    isLeaf: true,
    pageSize: 500,
  });

  const departmentOptions = useMemo(() => {
    const items = departmentsData?.data ?? [];
    if (items.length === 0) return [];
    return items.map((dept) => ({
      value: String(dept.biotimeDepartmentId),
      label: dept.name,
    }));
  }, [departmentsData]);

  // Debounce search input 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onChange]);

  const handleDateFilterChange = (value: AttendanceDateFilterValue) => {
    onChange({
      ...filters,
      date: value.mode === 'date' ? (value.date ?? '') : '',
      from: value.mode === 'range' ? (value.from ?? '') : '',
      to: value.mode === 'range' ? (value.to ?? '') : '',
    });
  };

  const handleClear = () => {
    setSearchInput('');
    onChange({ ...DEFAULT_FILTERS });
  };

  const activeCount = countActiveFilters(filters);

  return (
    <Stack gap="xs" className={styles.root}>
      <Group gap="xs" wrap="nowrap" className={styles.row}>
        {/* Search input */}
        <TextInput
          placeholder="Tìm mã NV, họ tên, phòng ban..."
          leftSection={<IconSearch size={15} />}
          rightSection={
            searchInput ? (
              <IconX
                size={14}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSearchInput('');
                  onChange({ ...filters, search: '' });
                }}
              />
            ) : null
          }
          value={searchInput}
          onChange={(e) => setSearchInput(e.currentTarget.value)}
          className={styles.searchInput}
          size="sm"
        />

        {/* Date filter with native inputs */}
        <AttendanceDateFilter
          value={dateFilterValue}
          onChange={handleDateFilterChange}
        />

        {/* Department filter */}
        <Select
          placeholder="Phòng ban"
          data={departmentOptions}
          value={filters.biotimeDepartmentId ? String(filters.biotimeDepartmentId) : null}
          onChange={(val) =>
            onChange({
              ...filters,
              biotimeDepartmentId: val ? Number(val) : null,
            })
          }
          clearable
          searchable
          size="sm"
          className={styles.selectInput}
          comboboxProps={{ withinPortal: true }}
          nothingFoundMessage={
            departmentsData?.data.length === 0
              ? 'Chưa có phòng ban'
              : 'Không tìm thấy'
          }
          disabled={departmentsData?.data.length === 0 && !departmentsData}
        />

        {/* Status filter */}
        <Select
          placeholder="Trạng thái"
          data={STATUS_OPTIONS}
          value={filters.status || null}
          onChange={(val) => onChange({ ...filters, status: val ?? '' })}
          clearable
          size="sm"
          className={styles.selectInput}
          comboboxProps={{ withinPortal: true }}
        />

        {/* Mapping filter */}
        <Select
          placeholder="Mapping"
          data={MAPPING_OPTIONS}
          value={filters.mappingStatus || null}
          onChange={(val) => onChange({ ...filters, mappingStatus: val ?? '' })}
          clearable
          size="sm"
          className={styles.selectInput}
          comboboxProps={{ withinPortal: true }}
        />

        {/* Actions */}
        <Group gap="xs" wrap="nowrap" className={styles.actions}>
          {maySync && (
            <Button
              leftSection={<IconRefresh size={15} />}
              onClick={onSync}
              loading={isSyncing}
              disabled={isSyncing}
              size="sm"
              variant="light"
              color="blue"
            >
              Đồng bộ
            </Button>
          )}

          {maySync && unmappedConflictCount > 0 && (
            <Button
              size="sm"
              variant="light"
              color="orange"
              onClick={onOpenMapping}
            >
              Xử lý mapping ({unmappedConflictCount})
            </Button>
          )}

          {activeCount > 0 && (
            <Button
              variant="subtle"
              size="sm"
              color="gray"
              onClick={handleClear}
              leftSection={
                <Badge size="xs" circle color="blue">
                  {activeCount}
                </Badge>
              }
            >
              Xóa lọc
            </Button>
          )}
        </Group>
      </Group>
    </Stack>
  );
}
