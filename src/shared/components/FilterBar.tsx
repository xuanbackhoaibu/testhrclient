import type { ReactNode } from 'react';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  children: ReactNode;
  /** Buttons pinned to the right of the row (sync, clear, apply…). */
  actions?: ReactNode;
}

/**
 * Wraps a screen's filter controls in one wrapping row. Size each control by
 * importing `FilterBar.module.css` directly and passing `.grow` / `.field` /
 * `.fieldWide` as its className, so every screen lands on the same widths.
 */
export function FilterBar({ children, actions }: FilterBarProps) {
  return (
    <div className={styles.root}>
      <div className={styles.row}>
        {children}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
