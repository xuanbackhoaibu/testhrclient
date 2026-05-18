import { useCallback, useEffect, useState } from 'react';
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
import { IconRefresh, IconSearch, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';

import styles from './AttendanceFilterBar.module.css';

export interface AttendanceFilters {
  search: string;
  date: string;
  from: string;
  to: string;
  status: string;
  mappingStatus: string;
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
  { value: 'SINGLE_PUNCH', label: '1 lần' },
  { value: 'UNKNOWN', label: 'Không xác định' },
];

const MAPPING_OPTIONS = [
  { value: 'MAPPED', label: 'Đã map' },
  { value: 'AUTO_MAPPED', label: 'Tự động' },
  { value: 'UNMAPPED', label: 'Chưa map' },
];

function hasActiveFilters(f: AttendanceFilters): boolean {
  return Boolean(
    f.search || f.date || f.from || f.to || f.status || f.mappingStatus,
  );
}

const DEFAULT_FILTERS: AttendanceFilters = {
  search: '',
  date: '',
  from: '',
  to: '',
  status: '',
  mappingStatus: '',
};

export function AttendanceFilterBar({
  filters,
  onChange,
  onSync,
  isSyncing,
  maySync,
}: AttendanceFilterBarProps) {
  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [searchInput, setSearchInput] = useState(filters.search);

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
      onChange({ ...filters, from: '', to: '', date: filters.date || dayjs().format('YYYY-MM-DD') });
    } else {
      onChange({ ...filters, date: '', from: filters.from || dayjs().format('YYYY-MM-DD'), to: filters.to || dayjs().format('YYYY-MM-DD') });
    }
  };

  const handleDateChange = useCallback(
    (value: Date | null) => {
      const formatted = value ? dayjs(value).format('YYYY-MM-DD') : '';
      onChange({ ...filters, date: formatted });
    },
    [filters, onChange],
  );

  const handleFromChange = useCallback(
    (value: Date | null) => {
      const formatted = value ? dayjs(value).format('YYYY-MM-DD') : '';
      onChange({ ...filters, from: formatted });
    },
    [filters, onChange],
  );

  const handleToChange = useCallback(
    (value: Date | null) => {
      const formatted = value ? dayjs(value).format('YYYY-MM-DD') : '';
      onChange({ ...filters, to: formatted });
    },
    [filters, onChange],
  );

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
  ].filter(Boolean).length;

  return (
    <Stack gap="xs" className={styles.root}>
      {/* Row 1: Search + Date controls */}
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
        <ButtonGroup size="xs" className={styles.dateModeToggle}>
          <Button
            variant={dateMode === 'single' ? 'filled' : 'default'}
            onClick={() => handleDateModeChange('single')}
          >
            Ngày
          </Button>
          <Button
            variant={dateMode === 'range' ? 'filled' : 'default'}
            onClick={() => handleDateModeChange('range')}
          >
            Khoảng
          </Button>
        </ButtonGroup>

        {/* Date pickers */}
        {dateMode === 'single' ? (
          <DatePickerInput
            placeholder="Chọn ngày"
            value={filters.date ? new Date(filters.date) : null}
            onChange={handleDateChange}
            clearable
            maxDate={new Date()}
            className={styles.dateInput}
            size="sm"
          />
        ) : (
          <Group gap={4} wrap="nowrap" className={styles.rangeInputs}>
            <DatePickerInput
              placeholder="Từ"
              value={filters.from ? new Date(filters.from) : null}
              onChange={handleFromChange}
              clearable
              maxDate={new Date()}
              className={styles.dateInput}
              size="sm"
            />
            <DatePickerInput
              placeholder="Đến"
              value={filters.to ? new Date(filters.to) : null}
              onChange={handleToChange}
              clearable
              maxDate={new Date()}
              className={styles.dateInput}
              size="sm"
            />
          </Group>
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
