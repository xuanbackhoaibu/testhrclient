// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const weeklyState = vi.hoisted(() => {
  const template = {
    id: "weekly-01",
    name: "Hành chính T2–T6",
    note: null,
    status: "ACTIVE" as const,
    days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      shiftId: weekday === 0 || weekday === 6 ? null : "shift-hc1",
      shift:
        weekday === 0 || weekday === 6
          ? null
          : {
              id: "shift-hc1",
              code: "HC1",
              name: "Ca hành chính",
              startTime: "08:00",
              endTime: "17:00",
            },
    })),
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };

  return {
    apply: vi.fn(),
    cancel: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    template,
    update: vi.fn(),
  };
});

vi.mock("../../features/auth/useAuth", () => ({
  useAuth: () => ({ can: () => true }),
}));

vi.mock("../../features/attendance/useWorkSchedule", () => ({
  useApplyWeeklyShiftTemplate: () => ({
    isPending: false,
    mutateAsync: weeklyState.apply,
  }),
  useCancelWeeklyShiftAssignments: () => ({
    isPending: false,
    mutateAsync: weeklyState.cancel,
  }),
  useCreateWeeklyShiftTemplate: () => ({
    isPending: false,
    mutateAsync: weeklyState.create,
  }),
  useDeleteWeeklyShiftTemplate: () => ({
    isPending: false,
    mutateAsync: weeklyState.delete,
  }),
  useUpdateWeeklyShiftTemplate: () => ({
    isPending: false,
    mutateAsync: weeklyState.update,
  }),
  useWeeklyShiftAssignments: () => ({
    data: [],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useWeeklyShiftTemplates: () => ({
    data: [weeklyState.template],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useWorkShifts: () => ({
    data: [
      {
        id: "shift-hc1",
        code: "HC1",
        name: "Ca hành chính",
        status: "ACTIVE",
        startTime: "08:00",
        endTime: "17:00",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("../../features/employees/useEmployees", () => ({
  useAllEmployees: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../features/organization/useUnits", () => ({
  useUnitsSelect: () => ({
    data: [{ id: "unit-01", code: "HACOM", name: "Hacom Holdings" }],
    isLoading: false,
  }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

import { WeeklyShiftTemplatesPage } from "./WeeklyShiftTemplatesPage";

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
    disconnect() {}
    observe() {}
    unobserve() {}
  },
});

describe("WeeklyShiftTemplatesPage browser-mock smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    weeklyState.create.mockResolvedValue(weeklyState.template);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the named weekly workflow with every write intercepted", () => {
    render(
      <MantineProvider>
        <WeeklyShiftTemplatesPage />
      </MantineProvider>,
    );

    expect(screen.getByText("Ca tuần là mẫu dùng chung, áp riêng cho từng CBNV")).toBeTruthy();
    expect(screen.getByText("Lịch Ca tuần đã áp dụng")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tạo ca tuần" })).toBeTruthy();
    expect(screen.getAllByText("Hành chính T2–T6").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nghỉ").length).toBeGreaterThan(0);

    expect(weeklyState.create).not.toHaveBeenCalled();
    expect(weeklyState.apply).not.toHaveBeenCalled();
    expect(weeklyState.cancel).not.toHaveBeenCalled();
    expect(weeklyState.delete).not.toHaveBeenCalled();
    expect(weeklyState.update).not.toHaveBeenCalled();
  });
});
