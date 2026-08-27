// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../../features/auth/useAuth', () => ({
  useAuth: () => ({ can: () => true }),
}));
vi.mock('../../features/organization/useDepartments', () => ({
  useAllDepartments: () => ({
    data: [{ id: 'department-1', code: 'KD', name: 'Ban Kinh doanh' }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../features/leave/useLeaveApprovalAssignments', () => ({
  useLeaveApprovalAssignments: () => ({
    data: [
      {
        id: 'assignment-1',
        stepCode: 'ATTENDANCE_TRACKER',
        scopeType: 'DEPARTMENT',
        departmentId: 'department-1',
        reviewerUserId: 'reviewer-1',
        reviewer: { id: 'reviewer-1', fullName: 'Nguyễn An', status: 'ACTIVE' },
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useLeaveApprovalReviewers: () => ({
    data: [
      { id: 'reviewer-1', fullName: 'Nguyễn An', email: 'an@example.com' },
      { id: 'reviewer-2', fullName: 'Trần Bình', email: 'binh@example.com' },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpsertLeaveApprovalAssignment: () => ({ mutateAsync: mocks.upsert, isPending: false }),
  useDeleteLeaveApprovalAssignment: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

import { LeaveApprovalAssignmentsPage } from './LeaveApprovalAssignmentsPage';

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

Object.defineProperty(Element.prototype, 'scrollIntoView', {
  writable: true,
  value: () => undefined,
});

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

function renderPage() {
  return render(
    <MantineProvider>
      <LeaveApprovalAssignmentsPage />
    </MantineProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  mocks.upsert.mockReset().mockResolvedValue(undefined);
  mocks.remove.mockReset().mockResolvedValue(undefined);
});

describe('LeaveApprovalAssignmentsPage', () => {
  it('hiển thị luồng duyệt theo đúng thứ tự 1 đến 4', () => {
    renderPage();

    const stages = [
      screen.getByText('Người theo dõi chấm công'),
      screen.getByText('Trưởng bộ phận'),
      screen.getByText('Chánh văn phòng'),
      screen.getByText('Ban Tổng giám đốc'),
    ];

    for (let index = 1; index < stages.length; index += 1) {
      expect(stages[index - 1].compareDocumentPosition(stages[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('tự lưu ngay khi chọn người duyệt mới', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('combobox', { name: /Người duyệt bước 1:/ }));
    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledWith({
      stepCode: 'ATTENDANCE_TRACKER',
      payload: { reviewerUserId: 'reviewer-2', departmentId: 'department-1' },
    }));
  });

  it('hỏi xác nhận trước khi gỡ người duyệt', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Gỡ người duyệt bước 1' }));
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(screen.getByText(/Bước 1 sẽ bị bỏ trống/)).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Gỡ người duyệt' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith({
      stepCode: 'ATTENDANCE_TRACKER',
      departmentId: 'department-1',
    }));
  });
});
