import { Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import dayjs from 'dayjs';
import { AttendanceNativeDateInput } from './AttendanceNativeDateInput';
import styles from './ManualSyncModal.module.css';

interface ManualSyncModalProps {
  opened: boolean;
  onClose: () => void;
  onSync: (params: { startDate: string; endDate: string; refreshDepartments: boolean }) => void;
  isLoading: boolean;
}

const MAX_DAYS = 7;

export function ManualSyncModal({ opened, onClose, onSync, isLoading }: ManualSyncModalProps) {
  const today = dayjs();
  const [startDate, setStartDate] = useState<string | undefined>(today.subtract(1, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState<string | undefined>(today.format('YYYY-MM-DD'));
  const [refreshDepartments, setRefreshDepartments] = useState(false);

  const diffDays = startDate && endDate
    ? dayjs(endDate, 'YYYY-MM-DD').diff(dayjs(startDate, 'YYYY-MM-DD'), 'day') + 1
    : 0;

  const isValid = Boolean(
    startDate &&
    endDate &&
    dayjs(endDate, 'YYYY-MM-DD').isAfter(dayjs(startDate, 'YYYY-MM-DD').subtract(1, 'day')) &&
    diffDays <= MAX_DAYS,
  );

  const handleSubmit = () => {
    if (!isValid || !startDate || !endDate) return;
    onSync({
      startDate,
      endDate,
      refreshDepartments,
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setStartDate(today.subtract(1, 'day').format('YYYY-MM-DD'));
      setEndDate(today.format('YYYY-MM-DD'));
      setRefreshDepartments(false);
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Đồng bộ dữ liệu chấm công"
      size="sm"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Chọn khoảng ngày để đồng bộ dữ liệu chấm công từ BioTime/ZKTeco.
          Tối đa {MAX_DAYS} ngày mỗi lần đồng bộ.
        </Text>

        <div className={styles.dateGrid}>
          <label className={styles.field}>
            <span>Từ ngày</span>
            <AttendanceNativeDateInput
              value={startDate}
              onChange={(date) => {
                setStartDate(date);
                if (date && endDate && date > endDate) {
                  setEndDate(date);
                }
              }}
              max={endDate}
              ariaLabel="Từ ngày đồng bộ"
            />
          </label>

          <label className={styles.field}>
            <span>Đến ngày</span>
            <AttendanceNativeDateInput
              value={endDate}
              onChange={setEndDate}
              min={startDate}
              ariaLabel="Đến ngày đồng bộ"
            />
          </label>
        </div>

        {diffDays > MAX_DAYS && (
          <Text size="xs" c="red">
            Khoảng ngày vượt quá {MAX_DAYS} ngày. Vui lòng chọn lại.
          </Text>
        )}

        {diffDays > 0 && diffDays <= MAX_DAYS && startDate && endDate && (
          <Text size="xs" c="dimmed">
            Khoảng cách: {diffDays} ngày ({startDate} → {endDate})
          </Text>
        )}

        <Checkbox
          label="Làm mới danh sách phòng ban BioTime trước khi đồng bộ"
          description="Chỉ bật khi cấu trúc phòng ban BioTime thay đổi; bật tùy chọn này làm đồng bộ lâu hơn."
          checked={refreshDepartments}
          onChange={(e) => setRefreshDepartments(e.currentTarget.checked)}
          size="sm"
        />

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!isValid}
          >
            Bắt đầu đồng bộ
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
