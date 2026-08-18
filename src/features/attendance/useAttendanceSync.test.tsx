// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mapAttendanceEmployee = vi.fn();
const remapAttendance = vi.fn();

vi.mock('./attendanceApi', () => ({
  listAttendanceDailyRecords: vi.fn(),
  getAttendanceSyncStatus: vi.fn(),
  listAttendanceSyncRuns: vi.fn(),
  manualAttendanceSync: vi.fn(),
  listBioTimeDepartments: vi.fn(),
  syncBioTimeDepartments: vi.fn(),
  getAttendanceMappingStats: vi.fn(),
  getUnmappedAttendance: vi.fn(),
  mapAttendanceEmployee: (...args: unknown[]) => mapAttendanceEmployee(...args),
  remapAttendance: (...args: unknown[]) => remapAttendance(...args),
}));

const { useMapAttendance, useRemapAttendance } = await import('./useAttendanceSync');

function wrapperWith(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useMapAttendance', () => {
  it('gửi đúng payload và làm mới cache sau khi map', async () => {
    mapAttendanceEmployee.mockResolvedValue({
      employee: { fullName: 'Nguyen Van A', employeeCode: 'HC001' },
      updatedAttendanceCount: 12,
    });

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useMapAttendance({ onSuccess }), {
      wrapper: wrapperWith(client),
    });

    result.current.mutate({ empCode: 'E01', employeeId: 'emp-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mapAttendanceEmployee).toHaveBeenCalledWith({ empCode: 'E01', employeeId: 'emp-1' });
    expect(onSuccess).toHaveBeenCalledTimes(1);

    // Map xong phải làm mới thống kê và danh sách chưa map, nếu không màn hình
    // vẫn hiện mã vừa map.
    const keys = invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(keys).toContain(JSON.stringify(['attendance-mapping-stats']));
    expect(keys).toContain(JSON.stringify(['attendance-mapping']));
    expect(keys).toContain(JSON.stringify(['employees']));
  });

  it('gọi onError khi API lỗi', async () => {
    mapAttendanceEmployee.mockRejectedValue(new Error('boom'));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const onError = vi.fn();

    const { result } = renderHook(() => useMapAttendance({ onError }), {
      wrapper: wrapperWith(client),
    });

    result.current.mutate({ empCode: 'E01', employeeId: 'emp-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('useRemapAttendance', () => {
  it('chạy được khi không truyền khoảng ngày', async () => {
    remapAttendance.mockResolvedValue({
      totalProcessed: 5,
      mappedCount: 3,
      autoMappedCount: 1,
      unmappedCount: 1,
      conflictCount: 0,
    });

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useRemapAttendance({ onSuccess }), {
      wrapper: wrapperWith(client),
    });

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(remapAttendance).toHaveBeenCalledWith(undefined);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('truyền nguyên khoảng ngày xuống API', async () => {
    remapAttendance.mockResolvedValue({
      totalProcessed: 1,
      mappedCount: 1,
      autoMappedCount: 0,
      unmappedCount: 0,
      conflictCount: 0,
    });

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useRemapAttendance(), {
      wrapper: wrapperWith(client),
    });

    result.current.mutate({ fromDate: '2026-08-01', toDate: '2026-08-31' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(remapAttendance).toHaveBeenCalledWith({
      fromDate: '2026-08-01',
      toDate: '2026-08-31',
    });
  });
});
