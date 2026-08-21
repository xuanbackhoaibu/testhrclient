// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { bulkClear } = vi.hoisted(() => ({ bulkClear: vi.fn() }));
vi.mock('./employeesApi', () => ({ bulkClearEmployeeBioTimeCode: bulkClear }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import { BulkClearBioTimeCodeModal } from './BulkClearBioTimeCodeModal';
import type { Employee } from './employeeTypes';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
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

function employee(id: string, code: string | null): Employee {
  return { id, employeeCode: `HC${id}`, fullName: `NV ${id}`, biotimeEmployeeCode: code } as Employee;
}

function renderModal(employees: Employee[], onSuccess = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <BulkClearBioTimeCodeModal
          employees={employees}
          opened
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return { onSuccess };
}

afterEach(cleanup);
beforeEach(() => bulkClear.mockReset());

describe('BulkClearBioTimeCodeModal', () => {
  it('cảnh báo rõ dữ liệu đã map không bị xóa', () => {
    renderModal([employee('1', '987667')]);
    expect(screen.getByText(/dữ liệu quẹt thẻ mới sẽ không tự vào bảng công/i)).toBeDefined();
  });

  it('chỉ gửi những nhân sự đang có mã, bỏ qua dòng trống', async () => {
    bulkClear.mockResolvedValue([
      { employeeId: '1', employeeCode: 'HC1', fullName: 'NV 1', previousCode: '987667', status: 'CLEARED' },
    ]);
    renderModal([employee('1', '987667'), employee('2', null)]);

    // nút hiển thị đúng số dòng thật sự bị tác động
    const button = screen.getByRole('button', { name: /Hủy mã chấm công \(1\)/ });
    expect(screen.getByText(/Bỏ qua 1 nhân sự vốn chưa có mã/i)).toBeDefined();

    await userEvent.click(button);

    await waitFor(() => expect(bulkClear).toHaveBeenCalledTimes(1));
    expect(bulkClear.mock.calls[0][0].map((e: Employee) => e.id)).toEqual(['1']);
  });

  it('không cho bấm khi mọi dòng đã chọn đều chưa có mã', () => {
    renderModal([employee('1', null)]);
    const button = screen.getByRole('button', { name: /Hủy mã chấm công \(0\)/ });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('báo rõ dòng lỗi trong bảng kết quả', async () => {
    bulkClear.mockResolvedValue([
      { employeeId: '1', employeeCode: 'HC1', fullName: 'NV 1', previousCode: '987667', status: 'CLEARED' },
      { employeeId: '2', employeeCode: 'HC2', fullName: 'NV 2', previousCode: '987669', status: 'FAILED', error: 'Hết quyền' },
    ]);
    renderModal([employee('1', '987667'), employee('2', '987669')]);

    await userEvent.click(screen.getByRole('button', { name: /Hủy mã chấm công \(2\)/ }));

    await waitFor(() => expect(screen.getByText('Kết quả hủy mã chấm công')).toBeDefined());
    // 1 đã hủy / 1 lỗi trong phần đếm
    expect(screen.getAllByText('Lỗi').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Đã hủy').length).toBeGreaterThan(1);
    // mã cũ vẫn hiện để HR gán lại nếu cần
    expect(screen.getByText('987669')).toBeDefined();
  });
});
