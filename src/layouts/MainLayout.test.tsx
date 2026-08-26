// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { MainLayout } from "./MainLayout";

const authState = vi.hoisted(() => ({
  permissions: ["*"] as string[],
}));

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      userId: "user-1",
      externalAuthUserId: "user-1",
      email: "hr@example.com",
      fullName: "HR Test",
      accountStatus: "ACTIVE",
      employeeId: null,
      roles: ["SUPER_ADMIN"],
      permissions: authState.permissions,
      authoritySource: "chat-auth-runtime",
      dataScopes: [],
    },
    logout: vi.fn(),
  }),
}));

vi.mock("../features/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: () => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: "",
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
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

const SECTION_LABELS = [
  "Quy trình chấm công",
  "Thiết lập",
  "Máy chấm công",
  "Cấu hình",
] as const;

function renderLayout() {
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={["/attendance/annual-leave-balances"]}>
        <MainLayout />
      </MemoryRouter>
    </MantineProvider>,
  );
}

function expandableControl(label: string): HTMLElement {
  const control = screen.getByText(label).closest<HTMLElement>("a[data-expanded], a");
  if (!control) {
    throw new Error(`Không tìm thấy nút thu gọn cho nhóm ${label}`);
  }
  return control;
}

beforeEach(() => {
  authState.permissions = ["*"];
});

afterEach(cleanup);

describe("MainLayout attendance navigation", () => {
  it("renders the four workflow groups in order and lets each group collapse", () => {
    renderLayout();

    const labels = SECTION_LABELS.map((label) => screen.getByText(label));
    for (let index = 1; index < labels.length; index += 1) {
      expect(
        labels[index - 1].compareDocumentPosition(labels[index]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }

    for (const label of SECTION_LABELS) {
      expect(expandableControl(label).getAttribute("data-expanded")).toBe("true");
    }

    const workflowControl = expandableControl("Quy trình chấm công");
    fireEvent.click(workflowControl);
    expect(workflowControl.getAttribute("data-expanded")).toBeNull();
    fireEvent.click(workflowControl);
    expect(workflowControl.getAttribute("data-expanded")).toBe("true");
  });

  it("keeps the workflow group visible when permission exposes only annual leave", () => {
    authState.permissions = ["hr.leave_balance.read"];
    renderLayout();

    expect(screen.getByText("Quy trình chấm công")).toBeTruthy();
    expect(screen.getAllByText("Bảng phép năm")).toHaveLength(2);
    expect(screen.queryByText("Thiết lập")).toBeNull();
    expect(screen.queryByText("Máy chấm công")).toBeNull();
    expect(screen.queryByText("Cấu hình")).toBeNull();
  });

  it("places the approval inbox between the timesheet and period close", () => {
    renderLayout();

    const labels = ["Bảng chấm công", "Duyệt công ca phép", "Kỳ chốt công"].map(
      (label) => screen.getAllByText(label).at(-1) as HTMLElement,
    );
    expect(
      labels[0].compareDocumentPosition(labels[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      labels[1].compareDocumentPosition(labels[2]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
