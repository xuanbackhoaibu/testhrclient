import { Badge } from '@mantine/core';

const STATUS_COLOR_MAP: Record<string, string> = {
  // Trạng thái nhân sự
  ACTIVE: 'green',
  INACTIVE: 'gray',
  PROBATION: 'yellow',
  TERMINATED: 'red',
  RESIGNED: 'gray',
  SUSPENDED: 'orange',
  // Luồng phê duyệt (điều chuyển, nghỉ phép, hợp đồng...)
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'orange',
  PENDING: 'gray',
  CONFIRMED: 'green',
  PENDING_HR_RULE: 'orange',
  COMPLETED: 'green',
  IN_PROGRESS: 'blue',
  FAILED: 'red',
  PARTIAL_SUCCESS: 'yellow',
  // Liên kết dữ liệu
  LINKED: 'green',
  UNLINKED: 'gray',
  // Trạng thái tài khoản
  NOT_CREATED: 'gray',
  PENDING_ACTIVATION: 'yellow',
  LOCKED: 'orange',
  DISABLED: 'red',
  DEACTIVATED: 'red',
  TOMBSTONED: 'dark',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  // Trạng thái nhân sự
  ACTIVE: 'Đang làm việc',
  INACTIVE: 'Tạm ngưng',
  PROBATION: 'Thử việc',
  TERMINATED: 'Nghỉ việc',
  RESIGNED: 'Đã nghỉ việc',
  SUSPENDED: 'Tạm dừng',
  // Luồng phê duyệt (điều chuyển, nghỉ phép, hợp đồng...)
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã gửi',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  PENDING_HR_RULE: 'Chờ quy tắc HR',
  COMPLETED: 'Hoàn tất',
  IN_PROGRESS: 'Đang xử lý',
  FAILED: 'Thất bại',
  PARTIAL_SUCCESS: 'Thành công một phần',
  // Liên kết dữ liệu
  LINKED: 'Đã liên kết',
  UNLINKED: 'Chưa liên kết',
  // Trạng thái tài khoản
  NOT_CREATED: 'Chưa tạo TK',
  PENDING_ACTIVATION: 'Chờ kích hoạt',
  LOCKED: 'Bị khóa',
  DISABLED: 'Vô hiệu hóa',
  DEACTIVATED: 'Đã hủy kích hoạt',
  TOMBSTONED: 'Đã xóa',
};

function StatusDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: `var(--mantine-color-${color}-6)`,
        flexShrink: 0,
      }}
    />
  );
}

export function StatusTag({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge color="gray" variant="light" radius="xl" size="sm" tt="none" fw={600}>
        —
      </Badge>
    );
  }

  const color = STATUS_COLOR_MAP[status] ?? 'gray';
  const label = STATUS_LABEL_MAP[status] ?? status;

  return (
    <Badge
      color={color}
      variant="light"
      radius="xl"
      size="sm"
      tt="none"
      fw={600}
      leftSection={<StatusDot color={color} />}
    >
      {label}
    </Badge>
  );
}

