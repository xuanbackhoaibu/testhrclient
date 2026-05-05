import type { MouseEvent, ReactNode } from 'react';
import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';

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
        <Tooltip key={action.label} label={action.label}>
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
        </Tooltip>
      ))}
    </Group>
  );
}
