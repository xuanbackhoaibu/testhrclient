import { useMemo } from 'react';
import { Badge, Button, Select, TextInput } from '@mantine/core';
import { IconRefresh, IconSearch, IconX } from '@tabler/icons-react';
import { useBioTimeDepartments } from '../../../features/attendance/useAttendanceSync';
import { AttendanceDateFilter } from './AttendanceDateFilter';
import type { AttendanceDateFilterValue } from './AttendanceDateFilter.types';
import styles from './AttendanceFilterBar.module.css';
import { useImeSafeSearch } from '../../../shared/hooks/useImeSafeSearch';
import { useImeSafeSelectFilter } from '../../../shared/hooks/useImeSafeSelectFilter';

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
  isSyncing: boolean;
  maySync: boolean;
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
  isSyncing,
  maySync,
}: AttendanceFilterBarProps) {
  const selectSearch = useImeSafeSelectFilter();
  const search = useImeSafeSearch({
    value: filters.search,
    onSearch: (value) => onChange({ ...filters, search: value }),
  });

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

  const handleDateFilterChange = (value: AttendanceDateFilterValue) => {
    onChange({
      ...filters,
      date: value.mode === 'date' ? (value.date ?? '') : '',
      from: value.mode === 'range' ? (value.from ?? '') : '',
      to: value.mode === 'range' ? (value.to ?? '') : '',
    });
  };

  const handleClear = () => {
    search.clear(false);
    onChange({ ...DEFAULT_FILTERS });
  };

  const activeCount = countActiveFilters(filters);

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        {/* Search input */}
        <TextInput
          placeholder="Tìm mã NV, họ tên, phòng ban..."
          leftSection={<IconSearch size={15} />}
          rightSection={
            search.inputValue ? (
              <IconX
                size={14}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  search.clear();
                }}
              />
            ) : null
          }
          {...search.inputProps}
          className={styles.searchInput}
          size="sm"
        />

        {/* Date filter */}
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
          {...selectSearch}
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

        {/* Nhóm thao tác */}
        <div className={styles.actions}>
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
        </div>
      </div>
    </div>
  );
}
