/**
 * Vietnamese wording for every status key the API returns. Single source of
 * truth: StatusTag renders these as badges, charts reuse them for legends and
 * tooltips, so a status never shows up as a raw English key in the UI.
 */
export const STATUS_LABEL_MAP: Record<string, string> = {
  ACTIVE: 'Đang làm việc',
  INACTIVE: 'Tạm ngưng',
  PROBATION: 'Thử việc',
  TERMINATED: 'Nghỉ việc',
  RESIGNED: 'Đã nghỉ việc',
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

/** The label for a status key, for places that need text without the badge. */
export function getStatusLabel(status?: string | null): string {
  if (!status) {
    return '-';
  }
  return STATUS_LABEL_MAP[status] ?? `Khác: ${status}`;
}
