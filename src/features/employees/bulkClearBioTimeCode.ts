import type { Employee } from './employeeTypes';

export interface BulkClearBioTimeItemResult {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  /** Mã chấm công ngay trước khi hủy — để HR còn đối chiếu / gán lại nếu lỡ tay. */
  previousCode: string;
  status: 'CLEARED' | 'FAILED';
  /** Chỉ có khi status = 'FAILED'. */
  error?: string;
}

export interface BulkClearBioTimeSelection {
  /** Nhân sự đang có mã — thật sự cần gọi API. */
  clearable: Employee[];
  /** Nhân sự vốn đã trống mã — bỏ qua, không gọi API cho tốn request. */
  alreadyEmpty: Employee[];
}

/**
 * Chia danh sách đang tick thành "cần hủy" và "vốn đã trống".
 *
 * Tách riêng để không bắn request thừa cho những dòng vốn đã không có mã, và để
 * hộp thoại xác nhận nói đúng số lượng sẽ bị tác động — HR tick cả trang rồi mới
 * đọc số, nên số đó phải là số thật.
 */
export function splitBioTimeClearSelection(
  employees: Employee[],
): BulkClearBioTimeSelection {
  const clearable: Employee[] = [];
  const alreadyEmpty: Employee[] = [];

  for (const employee of employees) {
    if (employee.biotimeEmployeeCode?.trim()) {
      clearable.push(employee);
    } else {
      alreadyEmpty.push(employee);
    }
  }

  return { clearable, alreadyEmpty };
}
