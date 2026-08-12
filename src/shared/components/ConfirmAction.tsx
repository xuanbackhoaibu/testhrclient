import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box } from '@mantine/core';

import { ConfirmActionModal } from './ConfirmActionModal';

interface ConfirmActionProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  color?: string;
  danger?: boolean;
  requiredText?: string;
  requireReason?: boolean;
  onConfirm: (payload?: { reason?: string }) => void;
  children: ReactNode;
}

export function ConfirmAction({
  title,
  description,
  confirmLabel,
  color,
  danger,
  requiredText,
  requireReason,
  onConfirm,
  children,
}: ConfirmActionProps) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Box component="span" onClick={() => setOpened(true)}>
        {children}
      </Box>
      <ConfirmActionModal
        opened={opened}
        title={title}
        message={description ?? 'Bạn có chắc chắn muốn thực hiện thao tác này?'}
        confirmLabel={confirmLabel}
        color={color}
        danger={danger}
        requiredText={requiredText}
        requireReason={requireReason}
        onClose={() => setOpened(false)}
        onConfirm={(payload) => {
          onConfirm(payload);
          setOpened(false);
        }}
      />
    </>
  );
}
