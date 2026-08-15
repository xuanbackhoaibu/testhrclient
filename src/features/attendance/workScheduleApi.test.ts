import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, patch, post } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../shared/api/httpClient", () => ({
  api: { get, patch, post },
}));

import {
  bulkAssignShifts,
  cancelShiftAssignmentDay,
  createShiftAssignment,
  getShiftAssignmentGrid,
  replaceShiftAssignmentDay,
  updateShiftAssignmentWeekdays,
  includeShiftAssignmentRowsInTimesheet,
} from "./workScheduleApi";

describe("monthly shift-assignment API", () => {
  beforeEach(() => {
    get.mockReset();
    patch.mockReset();
    post.mockReset();
  });

  it("loads the planned-shift grid with its selected month and organization scope", async () => {
    const query = {
      month: 8,
      year: 2026,
      unitId: "unit-01",
      departmentId: "department-03",
      search: "Ngọc Minh",
    };
    const grid = { month: 8, year: 2026, daysInMonth: 31, rows: [] };
    get.mockResolvedValue(grid);

    await expect(getShiftAssignmentGrid(query)).resolves.toEqual(grid);

    expect(get).toHaveBeenCalledWith(
      "/attendance/work-schedule/assignments/grid",
      { params: query },
    );
  });

  it("forwards weekday scope when creating an organizational rule", async () => {
    const payload = {
      shiftId: "shift-hc1",
      departmentId: "department-03",
      effectiveFrom: "2026-08-01",
      weekdays: [1, 2, 3, 4, 5],
    };
    const assignment = { id: "assignment-01" };
    post.mockResolvedValue(assignment);

    await expect(createShiftAssignment(payload)).resolves.toEqual(assignment);

    expect(post).toHaveBeenCalledWith(
      "/attendance/work-schedule/assignments",
      payload,
    );
  });

  it("patches only the weekday scope of an existing rule", async () => {
    const assignment = { id: "assignment-01", weekdays: [1, 2, 3, 4, 5] };
    patch.mockResolvedValue(assignment);

    await expect(
      updateShiftAssignmentWeekdays("assignment-01", {
        weekdays: [1, 2, 3, 4, 5],
      }),
    ).resolves.toEqual(assignment);

    expect(patch).toHaveBeenCalledWith(
      "/attendance/work-schedule/assignments/assignment-01",
      { weekdays: [1, 2, 3, 4, 5] },
    );
  });

  it("submits one atomic bulk assignment instead of creating employee assignments in the browser", async () => {
    const payload = {
      month: 8,
      year: 2026,
      unitId: "unit-01",
      employeeIds: ["employee-01", "employee-02"],
      shiftId: "shift-hc1",
      effectiveFrom: "2026-08-01",
      effectiveTo: "2026-08-31",
      weekdays: [1, 2, 3, 4, 5],
      includeInTimesheet: true,
    };
    const result = {
      created: 2,
      affected: [
        {
          employeeId: "employee-01",
          effectiveFrom: "2026-08-01",
          effectiveTo: "2026-08-31",
        },
      ],
      recomputeRequired: true,
    };
    post.mockResolvedValue(result);

    await expect(bulkAssignShifts(payload)).resolves.toEqual(result);

    expect(post).toHaveBeenCalledWith(
      "/attendance/work-schedule/assignments/bulk",
      payload,
    );
  });

  it("replaces one assigned day without sending a BCC inclusion flag", async () => {
    const payload = {
      month: 8,
      year: 2026,
      unitId: "unit-01",
      employeeId: "employee-01",
      shiftId: "shift-hc2",
      date: "2026-08-08",
    };
    const result = {
      changed: true,
      strategy: "CREATED_EMPLOYEE_OVERRIDE",
      employeeId: "employee-01",
      date: "2026-08-08",
      shiftId: "shift-hc2",
      recomputeRequired: true,
      affected: [{ employeeId: "employee-01", date: "2026-08-08" }],
    };
    post.mockResolvedValue(result);

    await expect(replaceShiftAssignmentDay(payload)).resolves.toEqual(result);

    expect(post).toHaveBeenCalledWith(
      "/attendance/work-schedule/assignments/replace-day",
      payload,
    );
  });

  it("cancels one direct assigned day without sending a BCC inclusion flag", async () => {
    const payload = {
      month: 8,
      year: 2026,
      unitId: "unit-01",
      employeeId: "employee-01",
      date: "2026-08-08",
    };
    const result = {
      changed: true,
      strategy: "SPLIT_DIRECT_RANGE",
      employeeId: "employee-01",
      date: "2026-08-08",
      shiftId: null,
      recomputeRequired: true,
      affected: [{ employeeId: "employee-01", date: "2026-08-08" }],
    };
    post.mockResolvedValue(result);

    await expect(cancelShiftAssignmentDay(payload)).resolves.toEqual(result);

    expect(post).toHaveBeenCalledWith(
      "/attendance/work-schedule/assignments/cancel-day",
      payload,
    );
  });

  it("puts selected planned-shift rows into BCC without reapplying their shift", async () => {
    const payload = {
      month: 8,
      year: 2026,
      unitId: "unit-01",
      employeeIds: ["employee-01", "employee-02"],
    };
    const result = {
      rosterId: "roster-08-2026-unit-01",
      includedInTimesheet: 2,
      recomputeRequired: true,
      affected: [],
    };
    post.mockResolvedValue(result);

    await expect(
      includeShiftAssignmentRowsInTimesheet(payload),
    ).resolves.toEqual(result);

    expect(post).toHaveBeenCalledWith(
      "/attendance/work-schedule/assignments/include-in-timesheet",
      payload,
    );
  });
});
