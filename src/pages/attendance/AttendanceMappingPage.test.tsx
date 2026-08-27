// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

const getAttendanceMappingStats = vi.fn();
const getUnmappedAttendance = vi.fn();

vi.mock('../../features/attendance/attendanceApi', () => ({
  getAttendanceMappingSuggestions: vi.fn(),
  listAttendanceDailyRecords: vi.fn(),
  getAttendanceSyncStatus: vi.fn(),
  listAttendanceSyncRuns: vi.fn(),
  manualAttendanceSync: vi.fn(),
  listBioTimeDepartments: vi.fn(),
  syncBioTimeDepartments: vi.fn(),
  getAttendanceMappingStats: (...a: unknown[]) => getAttendanceMappingStats(...a),
  getUnmappedAttendance: (...a: unknown[]) => getUnmappedAttendance(...a),
  mapAttendanceEmployee: vi.fn(),
  remapAttendance: vi.fn(),
}));

vi.mock('../../features/auth/useAuth', () => ({
  useAuth: () => ({ can: () => true }),
}));

const { AttendanceMappingPage } = await import('./AttendanceMappingPage');

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MantineProvider>
        <QueryClientProvider client={client}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </MantineProvider>
    );
  }
  return render(<AttendanceMappingPage />, { wrapper: Wrapper });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AttendanceMappingPage', () => {
  it('render và hiển thị dữ liệu chưa map lấy qua hook', async () => {
    getAttendanceMappingStats.mockResolvedValue({
      total: 100,
      mapped: 90,
      autoMapped: 5,
      unmapped: 10,
      conflict: 0,
    });
    getUnmappedAttendance.mockResolvedValue({
      items: [
        { empCode: 'E02', fullName: 'Tran Thi B', deptName: 'Sales', recordCount: 3, firstWorkDate: '2026-08-01', lastWorkDate: '2026-08-10' },
        { empCode: 'E01', fullName: 'Nguyen Van A', deptName: 'HCNS', recordCount: 5, firstWorkDate: '2026-08-01', lastWorkDate: '2026-08-12' },
      ],
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderPage();

    expect(await screen.findByText('E01')).toBeTruthy();
    expect(screen.getByText('E02')).toBeTruthy();

    // Hook được gọi đúng tham số phân trang/tìm kiếm của màn hình.
    await waitFor(() =>
      expect(getUnmappedAttendance).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 20 }),
      ),
    );
  });

  it('sắp xếp danh sách theo mã chấm công tăng dần', async () => {
    getAttendanceMappingStats.mockResolvedValue({
      total: 0,
      mapped: 0,
      autoMapped: 0,
      unmapped: 0,
      conflict: 0,
    });
    getUnmappedAttendance.mockResolvedValue({
      items: [
        { empCode: 'E10', fullName: 'C', deptName: 'X', recordCount: 1, firstWorkDate: '2026-08-01', lastWorkDate: '2026-08-02' },
        { empCode: 'E2', fullName: 'B', deptName: 'X', recordCount: 1, firstWorkDate: '2026-08-01', lastWorkDate: '2026-08-02' },
        { empCode: 'E1', fullName: 'A', deptName: 'X', recordCount: 1, firstWorkDate: '2026-08-01', lastWorkDate: '2026-08-02' },
      ],
      pagination: { page: 1, pageSize: 20, total: 3, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderPage();

    await screen.findByText('E1');
    const codes = screen
      .getAllByText(/^E\d+$/)
      .map((node) => node.textContent);

    // Natural sort: E1 < E2 < E10 (không phải thứ tự chuỗi E1, E10, E2).
    expect(codes).toEqual(['E1', 'E2', 'E10']);
  });

  it('hiển thị lỗi tải và đường thử lại thay vì báo nhầm là không có dữ liệu', async () => {
    getAttendanceMappingStats.mockRejectedValue(new Error('stats unavailable'));
    getUnmappedAttendance.mockRejectedValue(new Error('mapping unavailable'));

    renderPage();

    expect(await screen.findByText('Không tải được số liệu mapping')).toBeTruthy();
    expect(screen.getByText('Không tải được bản ghi chưa map')).toBeTruthy();
    expect(screen.queryByText('Không có bản ghi nào cần xử lý.')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Thử lại' })).toHaveLength(2);
  });
});
