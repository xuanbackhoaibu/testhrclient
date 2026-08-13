import { describe, expect, it } from 'vitest';

import { buildAttendanceDailyExportParams } from '../../features/attendance/attendanceDailyExport';

describe('attendance CSV export filters', () => {
  it('uses every active visible filter without limiting the export to one page', () => {
    expect(
      buildAttendanceDailyExportParams({
        search: 'HC000263',
        date: '',
        from: '2026-08-01',
        to: '2026-08-31',
        status: 'LATE',
        mappingStatus: 'MAPPED',
        biotimeDepartmentId: 324,
        page: 2,
        pageSize: 50,
      }),
    ).toEqual({
      search: 'HC000263',
      from: '2026-08-01',
      to: '2026-08-31',
      status: 'LATE',
      mappingStatus: 'MAPPED',
      biotimeDepartmentId: 324,
    });
  });

  it('preserves a valid zero-valued BioTime department id', () => {
    expect(
      buildAttendanceDailyExportParams({
        search: '',
        date: '2026-08-13',
        from: '',
        to: '',
        status: '',
        mappingStatus: '',
        biotimeDepartmentId: 0,
      }),
    ).toEqual({ date: '2026-08-13', biotimeDepartmentId: 0 });
  });
});
