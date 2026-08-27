import { describe, expect, it } from 'vitest';

import type { Employee } from '../employees/employeeTypes';
import { EMPLOYEE_EXPORT_COLUMNS } from './excelFilesApi';

describe('employee Excel export schema', () => {
  it('matches the employee import template without shifting sensitive fields', () => {
    expect(EMPLOYEE_EXPORT_COLUMNS.map((column) => column.header)).toEqual([
      'Mã NS',
      'Mã chấm công',
      'Họ tên',
      'Email công ty',
      'Email cá nhân',
      'Số điện thoại',
      'TT nhân sự',
      'TT tài khoản',
      'Đơn vị',
      'mã đơn vị',
      'Phòng ban',
      'Mã Phòng ban',
      'Chức danh',
      'Giới tính',
      'Ngày sinh',
      'CCCD/CMND',
      'Ngày vào làm',
    ]);

    const row = {
      employmentStatus: 'ACTIVE',
      gender: 'MALE',
    } as Employee;
    const byKey = Object.fromEntries(
      EMPLOYEE_EXPORT_COLUMNS.map((column) => [column.key, column]),
    );

    expect(byKey.employmentStatus.value?.(row)).toBe('ACTIVE');
    expect(byKey.gender.value?.(row)).toBe('MALE');
    expect(byKey.citizenId.value?.(row)).toBe('');
  });
});
