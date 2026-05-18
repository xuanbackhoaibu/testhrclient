import { Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useState } from 'react';
import dayjs from 'dayjs';

interface ManualSyncModalProps {
  opened: boolean;
  onClose: () => void;
  onSync: (params: { startDate: string; endDate: string; refreshDepartments: boolean }) => void;
  isLoading: boolean;
}

const MAX_DAYS = 7;

export function ManualSyncModal({ opened, onClose, onSync, isLoading }: ManualSyncModalProps) {
  const today = dayjs();
  const [startDate, setStartDate] = useState<Date | null>(today.subtract(1, 'day').toDate());
  const [endDate, setEndDate] = useState<Date | null>(today.toDate());
  const [refreshDepartments, setRefreshDepartments] = useState(true);

  const startStr = startDate ? dayjs(startDate).format('YYYY-MM-DD') : '';
  const endStr = endDate ? dayjs(endDate).format('YYYY-MM-DD') : '';

  const diffDays = startDate && endDate
    ? dayjs(endDate).diff(dayjs(startDate), 'day') + 1
    : 0;

  const isValid = startDate && endDate && dayjs(endDate).isAfter(dayjs(startDate).subtract(1, 'day')) && diffDays <= MAX_DAYS;

  const handleSubmit = () => {
    if (!isValid) return;
    onSync({
      startDate: startStr,
      endDate: endStr,
      refreshDepartments,
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      setStartDate(today.subtract(1, 'day').toDate());
      setEndDate(today.toDate());
      setRefreshDepartments(true);
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

        <Group grow align="flex-start">
          <DatePickerInput
            label="Từ ngày"
            placeholder="Chọn ngày bắt đầu"
            value={startDate}
            onChange={setStartDate}
            maxDate={new Date()}
            clearable
            size="sm"
          />
          <DatePickerInput
            label="Đến ngày"
            placeholder="Chọn ngày kết thúc"
            value={endDate}
            onChange={setEndDate}
            maxDate={new Date()}
            minDate={startDate ?? undefined}
            clearable
            size="sm"
          />
        </Group>

        {diffDays > MAX_DAYS && (
          <Text size="xs" c="red">
            Khoảng ngày vượt quá {MAX_DAYS} ngày. Vui lòng chọn lại.
          </Text>
        )}

        {diffDays > 0 && diffDays <= MAX_DAYS && (
          <Text size="xs" c="dimmed">
            Khoảng cách: {diffDays} ngày ({startStr} → {endStr})
          </Text>
        )}

        <Checkbox
          label="Làm mới danh sách phòng ban trước khi đồng bộ"
          description="Nên bật nếu cấu trúc phòng ban BioTime có thay đổi"
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
