import { Alert, Button, Group, Text } from '@mantine/core';
import { IconArrowRight, IconInfoCircle } from '@tabler/icons-react';

export function WorkReportAuthorizationNotice({ onOpen, canOpen }: { onOpen?: () => void; canOpen: boolean }) {
  return (
    <Alert icon={<IconInfoCircle size={16} />} color="violet" title="Quyền Báo cáo công việc">
      <Text size="sm">Quyền Báo cáo công việc được quản lý theo quan hệ nhân sự và ủy quyền chuyên biệt; không cấp qua quyền riêng hoặc nhóm quyền thông thường.</Text>
      {canOpen ? <Group mt="sm"><Button size="xs" variant="light" rightSection={<IconArrowRight size={14} />} onClick={onOpen}>Mở quản lý quyền Báo cáo công việc</Button></Group> : <Text size="sm" mt="sm">Liên hệ quản trị viên nhân sự để thay đổi phạm vi Báo cáo công việc.</Text>}
    </Alert>
  );
}
