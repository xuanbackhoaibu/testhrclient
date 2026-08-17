import type { ReactNode } from 'react';
import styles from './SectionCard.module.css';

interface SectionCardProps {
  title: ReactNode;
  /** Short count shown beside the title, e.g. "47 lịch". */
  count?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /**
   * Adds inner padding to the body. Leave false when the body is a table or
   * grid that draws its own edges.
   */
  padded?: boolean;
  /** Drops the divider under the header, for bodies with their own top border. */
  flushHeader?: boolean;
}

export function SectionCard({
  title,
  count,
  description,
  actions,
  children,
  padded = false,
  flushHeader = false,
}: SectionCardProps) {
  return (
    <section className={styles.root}>
      <div className={styles.header} data-flush={flushHeader ? 'true' : undefined}>
        <div className={styles.heading}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{title}</h2>
            {count !== undefined && <span className={styles.count}>{count}</span>}
          </div>
          {description && <p className={styles.description}>{description}</p>}
        </div>

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      <div className={styles.body} data-padded={padded ? 'true' : undefined}>
        {children}
      </div>
    </section>
  );
}
