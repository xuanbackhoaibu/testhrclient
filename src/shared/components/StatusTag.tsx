import { Badge } from '@mantine/core';

const STATUS_COLOR_MAP: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PROBATION: 'yellow',
  TERMINATED: 'red',
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'orange',
  COMPLETED: 'green',
  FAILED: 'red',
  PARTIAL_SUCCESS: 'yellow',
  IN_PROGRESS: 'blue',
  LINKED: 'green',
  UNLINKED: 'gray',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  ACTIVE: 'Đang làm việc',
  INACTIVE: 'Tạm ngưng',
  PROBATION: 'Thử việc',
  TERMINATED: 'Nghỉ việc',
  LINKED: 'Đã liên kết',
  UNLINKED: 'Chưa liên kết',
};

export function StatusTag({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge color="gray" variant="light">
        -
      </Badge>
    );
  }

  return (
    <Badge color={STATUS_COLOR_MAP[status] ?? 'gray'} variant="light" radius="sm">
      {STATUS_LABEL_MAP[status] ?? status}
    </Badge>
  );
}
