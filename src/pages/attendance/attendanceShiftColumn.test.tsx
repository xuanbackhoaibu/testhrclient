// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, describe, expect, it } from 'vitest';

import { addMinutesToTime } from '../../features/attendance/shiftTime';
import type { AttendanceDailyRecord } from '../../features/attendance/attendanceTypes';

// Mantine reads both at mount; jsdom ships neither.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: '',
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
});

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

/**
 * Mirrors the "Ca" column body in AttendancePage. The page component pulls in
 * routing, auth and react-query, so the cell is exercised through the same
 * helper and branch conditions rather than by booting the whole screen.
 */
function ShiftCell({ record }: { record: AttendanceDailyRecord }) {
  if (!record.shiftCode) {
    return <span>—</span>;
  }

  const threshold =
    record.shiftStartTime && record.shiftLateThresholdMinutes !== null
      ? addMinutesToTime(record.shiftStartTime, record.shiftLateThresholdMinutes)
      : null;

  return (
    <span>
      <span>{record.shiftCode}</span>
      {threshold && <span>{`≤${threshold}`}</span>}
    </span>
  );
}

function record(overrides: Partial<AttendanceDailyRecord>): AttendanceDailyRecord {
  return {
    id: 'r1',
    empCode: '1011',
    employeeId: null,
    employeeCode: null,
    fullName: 'Nguyễn Văn A',
    biotimeDepartmentId: 1,
    deptName: 'Ban QLDA',
    workDate: '2026-08-17',
    firstPunch: '07:46',
    lastPunch: '17:05',
    totalTime: '09:19',
    totalMinutes: 559,
    status: 'PRESENT',
    shiftCode: null,
    shiftStartTime: null,
    shiftLateThresholdMinutes: null,
    shiftSource: null,
    mappingStatus: 'MAPPED',
    syncStatus: 'SUCCESS',
    ...overrides,
  } as AttendanceDailyRecord;
}

function renderCell(value: AttendanceDailyRecord) {
  return render(
    <MantineProvider>
      <ShiftCell record={value} />
    </MantineProvider>,
  );
}

afterEach(cleanup);

describe('cột Ca trên bảng dữ liệu chấm công', () => {
  it('hiện mã ca và mốc tính muộn của chính ca đó', () => {
    renderCell(
      record({
        shiftCode: 'HC2',
        shiftStartTime: '08:00',
        shiftLateThresholdMinutes: 10,
        shiftSource: 'ASSIGNMENT_EMPLOYEE',
      }),
    );

    expect(screen.getByText('HC2')).toBeTruthy();
    expect(screen.getByText('≤08:10')).toBeTruthy();
  });

  it('dùng mốc riêng của từng ca, không phải một hằng số chung', () => {
    renderCell(
      record({
        shiftCode: 'HC1',
        shiftStartTime: '07:30',
        shiftLateThresholdMinutes: 15,
        shiftSource: 'ASSIGNMENT_EMPLOYEE',
      }),
    );

    expect(screen.getByText('≤07:45')).toBeTruthy();
  });

  it('hiện dấu gạch khi bản ghi không gắn ca nào', () => {
    renderCell(record({ shiftSource: 'UNASSIGNED' }));

    expect(screen.getByText('—')).toBeTruthy();
  });

  it('không dựng mốc giờ khi thiếu ngưỡng muộn', () => {
    renderCell(
      record({
        shiftCode: 'HC2',
        shiftStartTime: '08:00',
        shiftLateThresholdMinutes: null,
      }),
    );

    expect(screen.getByText('HC2')).toBeTruthy();
    expect(screen.queryByText(/≤/)).toBeNull();
  });

  it('coi ngưỡng 0 phút là hợp lệ, không phải thiếu dữ liệu', () => {
    renderCell(
      record({
        shiftCode: 'HC3',
        shiftStartTime: '07:30',
        shiftLateThresholdMinutes: 0,
      }),
    );

    expect(screen.getByText('≤07:30')).toBeTruthy();
  });

  it('hiện dấu gạch với bản ghi cũ đồng bộ trước khi có cột ca', () => {
    renderCell(record({}));

    expect(screen.getByText('—')).toBeTruthy();
  });
});
