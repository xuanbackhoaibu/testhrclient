import { describe, expect, it } from 'vitest';
import { summarizeAttendanceRecords } from './summarizeAttendanceRecords';
import type { AttendanceDailyRecord } from './attendanceTypes';

function record(overrides: Partial<AttendanceDailyRecord>): AttendanceDailyRecord {
  return {
    id: Math.random().toString(36).slice(2),
    empCode: '1011',
    employeeId: null,
    employeeCode: null,
    fullName: 'Nguyễn Văn A',
    biotimeDepartmentId: 1,
    deptName: 'Ban QLDA',
    workDate: '2026-08-17',
    firstPunch: '08:00',
    lastPunch: '17:30',
    totalTime: '09:30',
    totalMinutes: 570,
    status: 'PRESENT',
    mappingStatus: 'MAPPED',
    syncStatus: 'SUCCESS',
    syncRunId: null,
    ...overrides,
  } as AttendanceDailyRecord;
}

describe('summarizeAttendanceRecords', () => {
  it('returns zeroes for an empty list', () => {
    const summary = summarizeAttendanceRecords([]);

    expect(summary.total).toBe(0);
    expect(summary.present).toBe(0);
    expect(summary.unmapped).toBe(0);
  });

  it('counts each attendance status', () => {
    const summary = summarizeAttendanceRecords([
      record({ status: 'PRESENT' }),
      record({ status: 'PRESENT' }),
      record({ status: 'LATE' }),
      record({ status: 'ABSENT' }),
      record({ status: 'SINGLE_PUNCH' }),
      record({ status: 'UNKNOWN' }),
    ]);

    expect(summary.total).toBe(6);
    expect(summary.present).toBe(2);
    expect(summary.late).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.singlePunch).toBe(1);
    expect(summary.unknown).toBe(1);
  });

  it('counts each mapping status', () => {
    const summary = summarizeAttendanceRecords([
      record({ mappingStatus: 'MAPPED' }),
      record({ mappingStatus: 'AUTO_MAPPED' }),
      record({ mappingStatus: 'UNMAPPED' }),
      record({ mappingStatus: 'CONFLICT' }),
    ]);

    expect(summary.mapped).toBe(1);
    expect(summary.autoMapped).toBe(1);
    expect(summary.unmapped).toBe(1);
    expect(summary.conflict).toBe(1);
  });

  it('treats an unrecognised status as unknown rather than dropping the record', () => {
    const summary = summarizeAttendanceRecords([
      record({ status: 'SOMETHING_NEW' as AttendanceDailyRecord['status'] }),
    ]);

    expect(summary.total).toBe(1);
    expect(summary.unknown).toBe(1);
  });

  it('treats an unrecognised mapping status as unmapped', () => {
    const summary = summarizeAttendanceRecords([
      record({ mappingStatus: 'WEIRD' as AttendanceDailyRecord['mappingStatus'] }),
    ]);

    expect(summary.unmapped).toBe(1);
  });

  it('keeps status and mapping tallies independent', () => {
    const summary = summarizeAttendanceRecords([
      record({ status: 'PRESENT', mappingStatus: 'UNMAPPED' }),
      record({ status: 'UNKNOWN', mappingStatus: 'MAPPED' }),
    ]);

    expect(summary.present).toBe(1);
    expect(summary.unmapped).toBe(1);
    expect(summary.unknown).toBe(1);
    expect(summary.mapped).toBe(1);
  });
});
