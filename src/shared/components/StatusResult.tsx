import type { ReactNode } from 'react';
import { Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconLock, IconSearch, IconX } from '@tabler/icons-react';

type StatusKind = '403' | '404' | '500' | 'error';

const STATUS_PRESET: Record<StatusKind, { color: string; icon: ReactNode }> = {
  '403': { color: 'yellow', icon: <IconLock size={24} /> },
  '404': { color: 'gray', icon: <IconSearch size={24} /> },
  '500': { color: 'red', icon: <IconX size={24} /> },
  error: { color: 'red', icon: <IconAlertTriangle size={24} /> },
};

interface StatusResultProps {
  status?: StatusKind;
  title: string;
  subTitle?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
}

/** Thay cho `Result` của antd, giữ nguyên bố cục căn giữa và thứ bậc chữ. */
export function StatusResult({ status = 'error', title, subTitle, extra, children }: StatusResultProps) {
  const preset = STATUS_PRESET[status];

  return (
    <Paper p="xl" radius="md">
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon size={48} radius="xl" variant="light" color={preset.color}>
          {preset.icon}
        </ThemeIcon>
        <Title order={3}>{title}</Title>
        {subTitle ? (
          <Text c="dimmed" size="sm" maw={460}>
            {subTitle}
          </Text>
        ) : null}
        {children}
        {extra}
      </Stack>
    </Paper>
  );
}
