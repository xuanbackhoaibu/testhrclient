import type { MouseEvent, ReactNode } from 'react';
import { ActionIcon, Group } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';

import { SafeTooltip } from './SafeTooltip';

export interface TableActionItem {
  label: string;
  icon?: ReactNode;
  color?: string;
  disabled?: boolean;
  onClick: () => void;
}

interface TableActionsMenuProps {
  actions: TableActionItem[];
  label?: string;
}

function stopRowClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

export function TableActionsMenu({
  actions,
  label = 'Thao tac',
}: TableActionsMenuProps) {
  const visibleActions = actions.filter(Boolean);

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <Group
      gap={4}
      justify="flex-end"
      wrap="nowrap"
      onMouseDown={stopRowClick}
      aria-label={label}
    >
      {visibleActions.map((action) => (
        <SafeTooltip key={action.label} label={action.label} disabled={action.disabled}>
          <ActionIcon
            variant="subtle"
            color={action.color ?? 'gray'}
            aria-label={action.label}
            disabled={action.disabled}
            onMouseDown={stopRowClick}
            onClick={(event) => {
              stopRowClick(event);
              if (!action.disabled) {
                action.onClick();
              }
            }}
          >
            {action.icon ?? <IconDotsVertical size={16} />}
          </ActionIcon>
        </SafeTooltip>
      ))}
    </Group>
  );
}
