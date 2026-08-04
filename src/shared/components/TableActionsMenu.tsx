import type { MouseEvent, ReactNode } from 'react';
import { ActionIcon, Menu } from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';

import { SafeTooltip } from './SafeTooltip';

export interface TableActionItem {
  label: string;
  /** Icon shown both in the menu item and (when there is only one action) on the trigger button. */
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

/**
 * Renders row-level actions as a single, clearly-labelled dropdown menu.
 *
 * Previously each action rendered as its own button using the same "three dots"
 * icon (only the colour changed), so a row with several actions looked like a
 * strip of identical, ambiguous dots. Now there is exactly one recognisable
 * trigger per row; opening it reveals every action with an icon AND a text
 * label, so it's unambiguous what each option does.
 *
 * Exception: when there is only one action, we skip the menu and show that
 * action directly as a single icon button (with tooltip) — no need to make
 * the user open a menu for a single choice.
 */
export function TableActionsMenu({
  actions,
  label = 'Thao tác',
}: TableActionsMenuProps) {
  const visibleActions = actions.filter(Boolean);

  if (visibleActions.length === 0) {
    return null;
  }

  if (visibleActions.length === 1) {
    const action = visibleActions[0];
    return (
      <SafeTooltip label={action.label} disabled={action.disabled}>
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
    );
  }

  return (
    <Menu position="bottom-end" shadow="md" withinPortal zIndex={2100}>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={label}
          onMouseDown={stopRowClick}
          onClick={stopRowClick}
        >
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onMouseDown={stopRowClick}>
        {visibleActions.map((action) => (
          <Menu.Item
            key={action.label}
            color={action.color}
            leftSection={action.icon}
            disabled={action.disabled}
            onClick={(event) => {
              stopRowClick(event);
              if (!action.disabled) {
                action.onClick();
              }
            }}
          >
            {action.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
