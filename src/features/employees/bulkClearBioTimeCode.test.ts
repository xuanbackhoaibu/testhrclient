import { describe, expect, it } from 'vitest';

import { splitBioTimeClearSelection } from './bulkClearBioTimeCode';
import type { Employee } from './employeeTypes';

function employee(id: string, biotimeEmployeeCode: string | null): Employee {
  return { id, employeeCode: `HC${id}`, fullName: `NV ${id}`, biotimeEmployeeCode } as Employee;
}

describe('splitBioTimeClearSelection', () => {
  it('tách nhân sự có mã khỏi nhân sự vốn đã trống', () => {
    const result = splitBioTimeClearSelection([
      employee('1', '987667'),
      employee('2', null),
      employee('3', '987675'),
    ]);

    expect(result.clearable.map((e) => e.id)).toEqual(['1', '3']);
    expect(result.alreadyEmpty.map((e) => e.id)).toEqual(['2']);
  });

  it('coi mã chỉ có khoảng trắng là trống, không gọi API thừa', () => {
    const result = splitBioTimeClearSelection([employee('1', '   ')]);

    expect(result.clearable).toEqual([]);
    expect(result.alreadyEmpty.map((e) => e.id)).toEqual(['1']);
  });

  it('danh sách rỗng trả về hai nhánh rỗng', () => {
    expect(splitBioTimeClearSelection([])).toEqual({ clearable: [], alreadyEmpty: [] });
  });
});
