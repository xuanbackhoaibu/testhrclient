import type { ReactNode } from 'react';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
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

export function TableActionsMenu({ actions, label = 'Thao tác' }: TableActionsMenuProps) {
  return (
    <Menu position="bottom-end" shadow="md" width={190}>
      <Menu.Target>
        <Tooltip label={label}>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
          >
            <IconDotsVertical size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {actions.map((action) => (
          <Menu.Item
            key={action.label}
            leftSection={action.icon}
            color={action.color}
            disabled={action.disabled}
            onClick={(event) => {
              event.stopPropagation();
              action.onClick();
            }}
          >
            {action.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
