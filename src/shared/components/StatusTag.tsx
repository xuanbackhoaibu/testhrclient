import { Badge } from '@mantine/core';
import { STATUS_LABEL_MAP } from '../constants/statusLabels';
import styles from './StatusTag.module.css';

const STATUS_COLOR_MAP: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PROBATION: 'yellow',
  TERMINATED: 'red',
  RESIGNED: 'orange',
  SUSPENDED: 'orange',
  DRAFT: 'gray',
  SUBMITTED: 'hacomRed',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'orange',
  PENDING: 'gray',
  CONFIRMED: 'green',
  PENDING_HR_RULE: 'orange',
  COMPLETED: 'green',
  FAILED: 'red',
  PARTIAL_SUCCESS: 'yellow',
  IN_PROGRESS: 'hacomRed',
  LINKED: 'green',
  UNLINKED: 'gray',
  // Account statuses
  NOT_CREATED: 'gray',
  PENDING_ACTIVATION: 'yellow',
  LOCKED: 'orange',
  DISABLED: 'red',
  DEACTIVATED: 'red',
  TOMBSTONED: 'dark',
};

export function StatusTag({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge color="gray" variant="light" radius="sm" className={styles.badge}>
        -
      </Badge>
    );
  }

  return (
    <Badge
      color={STATUS_COLOR_MAP[status] ?? 'gray'}
      variant="light"
      radius="sm"
      className={styles.badge}
    >
      {STATUS_LABEL_MAP[status] ?? `Khác: ${status}`}
    </Badge>
  );
}
