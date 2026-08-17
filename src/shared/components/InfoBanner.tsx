import { useState, type ReactNode } from 'react';
import { UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconInfoCircle } from '@tabler/icons-react';
import styles from './InfoBanner.module.css';

export type InfoBannerTone = 'info' | 'warning' | 'neutral';

interface InfoBannerProps {
  /** Bold lead-in above the body; omit for a single-line note. */
  title?: ReactNode;
  children: ReactNode;
  tone?: InfoBannerTone;
  /**
   * Collapses the body behind the title so long policy text does not push the
   * working area down the page. Requires a title.
   */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const ICONS: Record<InfoBannerTone, typeof IconInfoCircle> = {
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  neutral: IconInfoCircle,
};

export function InfoBanner({
  title,
  children,
  tone = 'info',
  collapsible = false,
  defaultOpen = false,
}: InfoBannerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = ICONS[tone];
  const canCollapse = collapsible && Boolean(title);
  const showBody = !canCollapse || open;

  return (
    <div className={styles.root} data-tone={tone}>
      <Icon size={17} className={styles.icon} aria-hidden />

      <div className={styles.body}>
        {title &&
          (canCollapse ? (
            <UnstyledButton
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className={styles.title}
            >
              {title}
            </UnstyledButton>
          ) : (
            <div className={styles.title}>{title}</div>
          ))}

        {showBody && <div className={styles.content}>{children}</div>}
      </div>

      {canCollapse && (
        <UnstyledButton
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Thu gọn' : 'Xem chi tiết'}
          aria-expanded={open}
          className={styles.toggle}
        >
          <IconChevronDown
            size={16}
            style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }}
          />
        </UnstyledButton>
      )}
    </div>
  );
}
