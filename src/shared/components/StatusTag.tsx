import { Badge } from '@mantine/core';
import styles from './StatusTag.module.css';

const STATUS_COLOR_MAP: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PROBATION: 'yellow',
  TERMINATED: 'red',
  RESIGNED: 'orange',
  SUSPENDED: 'orange',
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'orange',
  PENDING: 'gray',
  CONFIRMED: 'green',
  PENDING_HR_RULE: 'orange',
  COMPLETED: 'green',
  FAILED: 'red',
  PARTIAL_SUCCESS: 'yellow',
  IN_PROGRESS: 'blue',
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

const STATUS_LABEL_MAP: Record<string, string> = {
  ACTIVE: 'Đang làm việc',
  INACTIVE: 'Tạm ngưng',
  PROBATION: 'Thử việc',
  TERMINATED: 'Nghỉ việc',
  RESIGNED: 'Admin',
  SUSPENDED: 'Tạm dừng',
  DRAFT: 'Nháp',
  SUBMITTED: 'Đang trình duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  PENDING_HR_RULE: 'Chờ quy tắc HR',
  LINKED: 'Đã liên kết',
  UNLINKED: 'Chưa liên kết',
  // Account statuses
  NOT_CREATED: 'Chưa tạo TK',
  PENDING_ACTIVATION: 'Chờ kích hoạt',
  LOCKED: 'Bị khóa',
  DISABLED: 'Vô hiệu hóa',
  DEACTIVATED: 'Đã hủy kích hoạt',
  TOMBSTONED: 'Đã xóa',
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
