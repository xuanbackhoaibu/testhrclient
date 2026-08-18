import { Modal, SimpleGrid, Text, UnstyledButton, ThemeIcon } from '@mantine/core';
import { IconUsers, IconUser } from '@tabler/icons-react';
import styles from './AddCalendarChoiceModal.module.css';

export type CalendarChoiceKind = 'meeting' | 'personal';

interface AddCalendarChoiceModalProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (kind: CalendarChoiceKind) => void;
}

/**
 * Bước 1 của luồng "Thêm lịch" — tham khảo modal cùng tên của chat-web-client
 * (2 thẻ lựa chọn: Lịch họp / Lịch cá nhân). Chọn xong sẽ mở form tương ứng
 * (MeetingFormModal / PersonalEventFormModal) ở CalendarPage.
 */
export function AddCalendarChoiceModal({ opened, onClose, onSelect }: AddCalendarChoiceModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Thêm lịch" size="md" centered>
      <Text size="sm" c="dimmed" mb="md">
        Chọn loại lịch bạn muốn thêm.
      </Text>
      <SimpleGrid cols={2} spacing="md">
        <UnstyledButton className={styles.card} onClick={() => onSelect('meeting')}>
          <ThemeIcon size={48} radius="xl" variant="light" color="blue">
            <IconUsers size={24} />
          </ThemeIcon>
          <Text fw={600} mt="sm">
            Lịch họp
          </Text>
          <Text size="xs" c="dimmed" ta="center" mt={4}>
            Mời người tham gia, chủ trì, địa điểm
          </Text>
        </UnstyledButton>

        <UnstyledButton className={styles.card} onClick={() => onSelect('personal')}>
          <ThemeIcon size={48} radius="xl" variant="light" color="orange">
            <IconUser size={24} />
          </ThemeIcon>
          <Text fw={600} mt="sm">
            Lịch cá nhân
          </Text>
          <Text size="xs" c="dimmed" ta="center" mt={4}>
            Chỉ mình bạn — ngày, giờ, nội dung
          </Text>
        </UnstyledButton>
      </SimpleGrid>
    </Modal>
  );
}
