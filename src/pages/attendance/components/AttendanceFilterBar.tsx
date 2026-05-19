import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ButtonGroup,
  Group,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconSearch, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';

import { useBioTimeDepartments } from '../../../features/attendance/useAttendanceSync';
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
  isSyncing: boolean;
  maySync: boolean;
}

type DateMode = 'single' | 'range';

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Đủ công' },
  { value: 'LATE', label: 'Đi muộn' },
  { value: 'ABSENT', label: 'Vắng' },
  { value: 'SINGLE_PUNCH', label: 'Chấm 1 lần' },
  { value: 'UNKNOWN', label: 'Không xác định' },
];

const MAPPING_OPTIONS = [
  { value: 'MAPPED', label: 'Đã map' },
  { value: 'AUTO_MAPPED', label: 'Tự động' },
  { value: 'UNMAPPED', label: 'Chưa map' },
];

const DEFAULT_FILTERS: AttendanceFilters = {
  search: '',
  date: dayjs().format('YYYY-MM-DD'),
  from: '',
  to: '',
  status: '',
  mappingStatus: '',
  biotimeDepartmentId: null,
};

function hasActiveFilters(f: AttendanceFilters): boolean {
  return Boolean(f.search || f.date || f.from || f.to || f.status || f.mappingStatus || f.biotimeDepartmentId);
}

export function AttendanceFilterBar({
  filters,
  onChange,
  onSync,
  isSyncing,
  maySync,
}: AttendanceFilterBarProps) {
  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [searchInput, setSearchInput] = useState(filters.search);

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

  // Debounce search input 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onChange]);

  const handleDateModeChange = (mode: DateMode) => {
    setDateMode(mode);
    if (mode === 'single') {
      onChange({
        ...filters,
        from: '',
        to: '',
        date: filters.date || dayjs().format('YYYY-MM-DD'),
      });
    } else {
      onChange({
        ...filters,
        date: '',
        from: filters.from || dayjs().format('YYYY-MM-DD'),
        to: filters.to || dayjs().format('YYYY-MM-DD'),
      });
    }
  };

  // Date handlers - DatePickerInput onChange accepts string | null in Mantine v9
  const handleDateChange = (value: string | null) => {
    if (!value) {
      onChange({ ...filters, date: '' });
      return;
    }
    const parsed = dayjs(value, 'YYYY-MM-DD', true);
    onChange({ ...filters, date: parsed.isValid() ? value : filters.date });
  };

  const handleFromChange = (value: string | null) => {
    if (!value) {
      onChange({ ...filters, from: '' });
      return;
    }
    const parsed = dayjs(value, 'YYYY-MM-DD', true);
    onChange({ ...filters, from: parsed.isValid() ? value : filters.from });
  };

  const handleToChange = (value: string | null) => {
    if (!value) {
      onChange({ ...filters, to: '' });
      return;
    }
    const parsed = dayjs(value, 'YYYY-MM-DD', true);
    onChange({ ...filters, to: parsed.isValid() ? value : filters.to });
  };

  const handleClear = () => {
    setSearchInput('');
    onChange({ ...DEFAULT_FILTERS });
    setDateMode('single');
  };

  const activeFiltersCount = [
    filters.search,
    filters.date,
    filters.from,
    filters.to,
    filters.status,
    filters.mappingStatus,
    filters.biotimeDepartmentId,
  ].filter(Boolean).length;

  const parseDateValue = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const parsed = dayjs(dateStr, 'YYYY-MM-DD', true);
    return parsed.isValid() ? dateStr : null;
  };

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

        {/* Date mode toggle */}
        <ButtonGroup className={styles.dateModeToggle}>
          <Button
            variant={dateMode === 'single' ? 'filled' : 'default'}
            onClick={() => handleDateModeChange('single')}
            size="xs"
          >
            Ngày
          </Button>
          <Button
            variant={dateMode === 'range' ? 'filled' : 'default'}
            onClick={() => handleDateModeChange('range')}
            size="xs"
          >
            Khoảng
          </Button>
        </ButtonGroup>

        {/* Date pickers */}
        {dateMode === 'single' ? (
          <div className={styles.dateFilterWrapper}>
            <DatePickerInput
              placeholder="Chọn ngày"
              value={parseDateValue(filters.date)}
              onChange={handleDateChange}
              clearable
              maxDate={new Date()}
              className={styles.dateInput}
              popoverProps={{
                withinPortal: true,
                position: 'bottom-start',
                shadow: 'md',
                radius: 'md',
                zIndex: 300,
                classNames: {
                  dropdown: 'attendance-date-filter-dropdown',
                },
              }}
              size="sm"
            />
          </div>
        ) : (
          <div className={styles.dateFilterWrapper}>
            <Group gap={4} wrap="nowrap" className={styles.rangeInputs}>
              <DatePickerInput
                placeholder="Từ"
                value={parseDateValue(filters.from)}
                onChange={handleFromChange}
                clearable
                maxDate={new Date()}
                className={styles.dateInput}
                popoverProps={{
                  withinPortal: true,
                  position: 'bottom-start',
                  shadow: 'md',
                  radius: 'md',
                  zIndex: 300,
                  classNames: {
                    dropdown: 'attendance-date-filter-dropdown',
                  },
                }}
                size="sm"
              />
              <DatePickerInput
                placeholder="Đến"
                value={parseDateValue(filters.to)}
                onChange={handleToChange}
                clearable
                maxDate={new Date()}
                className={styles.dateInput}
                popoverProps={{
                  withinPortal: true,
                  position: 'bottom-start',
                  shadow: 'md',
                  radius: 'md',
                  zIndex: 300,
                  classNames: {
                    dropdown: 'attendance-date-filter-dropdown',
                  },
                }}
                size="sm"
              />
            </Group>
          </div>
        )}

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
              ? 'Chưa có phòng ban BioTime'
              : 'Không tìm thấy phòng ban'
          }
          disabled={departmentsData?.data.length === 0 && !departmentsData}
        />

        {/* Actions */}
        <Group gap="xs" wrap="nowrap" className={styles.actions}>
          {maySync && (
            <Button
              leftSection={<IconSearch size={15} />}
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

          {hasActiveFilters(filters) && (
            <Button
              variant="subtle"
              size="sm"
              color="gray"
              onClick={handleClear}
              leftSection={
                <Badge size="xs" circle color="blue">
                  {activeFiltersCount}
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
