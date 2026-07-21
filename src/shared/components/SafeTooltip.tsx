import type { ReactNode } from 'react';
import { Tooltip } from '@mantine/core';

interface SafeTooltipProps {
  label?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/** A portal-based tooltip that cannot be clipped by table scroll containers. */
export function SafeTooltip({
  label,
  children,
  disabled = false,
  position = 'top',
}: SafeTooltipProps) {
  if (disabled || label === null || label === undefined || label === '') {
    return <>{children}</>;
  }

  return (
    <Tooltip
      label={label}
      position={position}
      withinPortal
      zIndex={2100}
      openDelay={350}
      closeDelay={80}
      withArrow
      multiline
      maw={320}
    >
      <span style={{ display: 'inline-flex', maxWidth: '100%' }}>{children}</span>
    </Tooltip>
  );
}
