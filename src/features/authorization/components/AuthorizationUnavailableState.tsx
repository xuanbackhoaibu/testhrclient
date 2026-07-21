import { Alert, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';

export function AuthorizationUnavailableState({ children }: { children: ReactNode }) {
  return <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Chức năng đang được hoàn thiện">{children}</Alert>;
}

export function AuthorizationServerValidationNotice() {
  return (
    <Text size="sm" c="dimmed">
      Máy chủ sẽ kiểm tra lại thẩm quyền phân quyền và mức độ nhạy cảm khi lưu. Một số thay đổi có thể bị từ chối dù đang hiển thị trong danh sách.
    </Text>
  );
}
