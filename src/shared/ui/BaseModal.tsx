import { Modal, Text } from '@mantine/core';
import type { ModalProps } from '@mantine/core';

export type BaseModalProps = ModalProps;

export function BaseModal({ title, children, centered = true, radius = 'md', ...props }: BaseModalProps) {
  const normalizedTitle =
    typeof title === 'string' ? (
      <Text fw={750} size="md">
        {title}
      </Text>
    ) : (
      title
    );

  return (
    <Modal
      title={normalizedTitle}
      centered={centered}
      radius={radius}
      overlayProps={{ backgroundOpacity: 0.32, blur: 2, ...props.overlayProps }}
      {...props}
    >
      {children}
    </Modal>
  );
}
