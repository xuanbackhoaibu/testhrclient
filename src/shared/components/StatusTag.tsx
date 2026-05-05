import { Tag } from 'antd';

const STATUS_COLOR_MAP: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'default',
  PROBATION: 'gold',
  TERMINATED: 'red',
  DRAFT: 'default',
  SUBMITTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'volcano',
  COMPLETED: 'green',
  FAILED: 'red',
  PARTIAL_SUCCESS: 'gold',
  IN_PROGRESS: 'processing',
};

export function StatusTag({ status }: { status?: string | null }) {
  if (!status) {
    return <Tag>-</Tag>;
  }

  return <Tag color={STATUS_COLOR_MAP[status] ?? 'default'}>{status}</Tag>;
}

