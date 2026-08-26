// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  requestItems: [] as Array<Record<string, unknown>>,
}));

const leaveType = {
  id: "leave-type-1",
  code: "ANNUAL",
  name: "Nghỉ phép năm",
  displaySymbol: "P",
  deductsAnnualLeave: true,
  paid: true,
  dayValue: 1,
  requiresAttachment: false,
  attachmentMinDays: null,
  quotaMode: "ANNUAL_BALANCE",
  maxDaysPerEvent: null,
  hrRuleStatus: "CONFIRMED",
  note: null,
  status: "ACTIVE",
};

vi.mock("../../features/auth/useAuth", () => ({
  useAuth: () => ({ can: () => true }),
}));
vi.mock("../../features/employees/useEmployees", () => ({
  useEmployees: () => ({
    data: { items: [] },
    isFetching: false,
  }),
}));
vi.mock("../../features/leave/useLeaveRequests", () => ({
  useLeaveRequests: () => ({
    data: {
      items: mocks.requestItems,
      pagination: {
        page: 1,
        pageSize: 10,
        total: mocks.requestItems.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useLeaveTypes: () => ({
    data: [leaveType],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useDeleteCancelledLeaveRequest: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateLeaveType: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateLeaveType: () => ({ mutateAsync: mocks.update, isPending: false }),
  useDeleteLeaveType: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));
vi.mock("@mantine/notifications", () => ({ notifications: { show: vi.fn() } }));

import { LeavePage } from "./LeavePage";

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

Object.defineProperty(Element.prototype, "scrollIntoView", {
  writable: true,
  value: () => undefined,
});

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
Object.defineProperty(document, "fonts", {
  configurable: true,
  value: {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
});

function renderPage() {
  return render(
    <MantineProvider>
      <LeavePage />
    </MantineProvider>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  mocks.requestItems = [];
  mocks.create.mockReset().mockResolvedValue(undefined);
  mocks.update.mockReset().mockResolvedValue(undefined);
  mocks.remove.mockReset().mockResolvedValue(undefined);
});

describe("LeavePage leave policy catalog", () => {
  it("creates a leave policy type from the catalog drawer", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Thêm ký hiệu" }));
    const drawer = await screen.findByRole("dialog");
    await user.type(within(drawer).getByLabelText(/^Ký hiệu/), "CP");
    await user.type(
      within(drawer).getByLabelText(/^Tên ký hiệu/),
      "Nghỉ theo chính sách",
    );
    await user.click(
      within(drawer).getByRole("button", { name: "Thêm ký hiệu" }),
    );

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          displaySymbol: "CP",
          name: "Nghỉ theo chính sách",
          quotaMode: "NONE",
        }),
      ),
    );
  });

  it("edits an existing leave policy type", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Chỉnh sửa P" }));
    const drawer = await screen.findByRole("dialog");
    const nameInput = within(drawer).getByLabelText(/^Tên ký hiệu/);
    await user.clear(nameInput);
    await user.type(nameInput, "Phép năm cập nhật");
    await user.click(
      within(drawer).getByRole("button", { name: "Lưu thay đổi" }),
    );

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        id: "leave-type-1",
        payload: expect.objectContaining({ name: "Phép năm cập nhật" }),
      }),
    );
  });

  it("asks for confirmation before removing a leave policy type", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Xóa P" }));
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        /Dữ liệu quỹ phép và lịch sử liên quan vẫn được giữ nguyên/,
      ),
    ).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Xóa khỏi danh mục" }));
    await waitFor(() =>
      expect(mocks.remove).toHaveBeenCalledWith("leave-type-1"),
    );
  });

  it("shows the official P/KL allocation and handover employee received from Chat", () => {
    mocks.requestItems = [
      {
        id: "leave-1",
        employeeId: "emp-1",
        employeeName: "Nguyễn Văn Một",
        leaveType: "ANNUAL",
        startDate: "2026-08-27",
        endDate: "2026-08-27",
        startHalfDaySession: "FULL_DAY",
        endHalfDaySession: "FULL_DAY",
        totalDays: 1,
        annualPaidDays: 0.5,
        unpaidDays: 0.5,
        reason: "Việc gia đình",
        status: "SUBMITTED",
        replacementEmployee: {
          id: "emp-2",
          employeeCode: "HC0002",
          fullName: "Trần An",
        },
        approvalSteps: [],
      },
    ];

    renderPage();

    expect(
      screen.getByRole("columnheader", { name: "Phân bổ P/KL" }),
    ).toBeDefined();
    expect(screen.getByText("0,5 P")).toBeDefined();
    expect(screen.getByText("0,5 KL")).toBeDefined();
    expect(screen.getByText("Trần An")).toBeDefined();
    expect(screen.getByText("HC0002")).toBeDefined();
  });
});
