// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listLeave: vi.fn(),
  approveLeave: vi.fn(),
  rejectLeave: vi.fn(),
  listExplanations: vi.fn(),
  approveExplanation: vi.fn(),
  rejectExplanation: vi.fn(),
}));

vi.mock("../../features/auth/useAuth", () => ({
  useAuth: () => ({ can: () => true }),
}));
vi.mock("../../features/leave/leaveApi", () => ({
  listPendingLeaveApprovals: (...args: unknown[]) => mocks.listLeave(...args),
  approveLeaveRequest: (...args: unknown[]) => mocks.approveLeave(...args),
  rejectLeaveRequest: (...args: unknown[]) => mocks.rejectLeave(...args),
}));
vi.mock("../../features/attendance/attendanceExplanationApi", () => ({
  listPendingAttendanceExplanations: (...args: unknown[]) => mocks.listExplanations(...args),
  approveAttendanceExplanation: (...args: unknown[]) => mocks.approveExplanation(...args),
  rejectAttendanceExplanation: (...args: unknown[]) => mocks.rejectExplanation(...args),
}));
vi.mock("@mantine/notifications", () => ({ notifications: { show: vi.fn() } }));

import { ApprovalInboxPage } from "./ApprovalInboxPage";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: () => ({
    matches: false,
    media: "",
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

const pagination = {
  page: 1,
  pageSize: 20,
  total: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <ApprovalInboxPage />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listLeave.mockResolvedValue({
    items: [
      {
        id: "leave-1",
        employeeId: "employee-1",
        leaveType: "ANNUAL",
        startDate: "2026-08-28",
        endDate: "2026-08-28",
        totalDays: 1,
        reason: "Việc gia đình",
        status: "SUBMITTED",
        employee: { id: "employee-1", employeeCode: "HC0001", fullName: "Nguyễn An" },
        currentApprovalStep: { stepOrder: 1, stepName: "Người theo dõi chấm công", status: "SUBMITTED" },
      },
    ],
    pagination,
  });
  mocks.listExplanations.mockResolvedValue([
    {
      id: "explanation-1",
      employeeId: "employee-2",
      timesheetDayId: "day-1",
      type: "LATE",
      reason: "Đi công trình buổi sáng",
      status: "SUBMITTED",
      employee: { employeeCode: "HC0002", fullName: "Trần Bình" },
      timesheetDay: { workDate: "2026-08-25", displaySymbol: "?" },
    },
  ]);
  mocks.approveLeave.mockResolvedValue({ id: "leave-1" });
  mocks.rejectLeave.mockResolvedValue({ id: "leave-1" });
  mocks.approveExplanation.mockResolvedValue({ id: "explanation-1" });
  mocks.rejectExplanation.mockResolvedValue({ id: "explanation-1" });
});

afterEach(cleanup);

describe("ApprovalInboxPage", () => {
  it("shows both canonical approval queues in one HRM screen", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Nguyễn An")).toBeTruthy();
    expect(screen.getByText("MCB: HC0001")).toBeTruthy();
    expect(mocks.listLeave).toHaveBeenCalledWith({ page: 1, pageSize: 20 });

    await user.click(screen.getByRole("tab", { name: /Giải trình chấm công/ }));
    expect(await screen.findByText("Trần Bình")).toBeTruthy();
    expect(screen.getByText("Đi công trình buổi sáng")).toBeTruthy();
    expect(mocks.listExplanations).toHaveBeenCalledTimes(1);
  });

  it("asks for confirmation and sends the review note", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Nguyễn An");

    await user.click(screen.getByRole("button", { name: "Duyệt" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Ghi chú xử lý"), "Đã đối chiếu lịch");
    await user.click(within(dialog).getByRole("button", { name: "Duyệt" }));

    await waitFor(() =>
      expect(mocks.approveLeave).toHaveBeenCalledWith(
        "leave-1",
        "Đã đối chiếu lịch",
      ),
    );
  });
});
