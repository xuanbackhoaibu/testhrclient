import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../shared/api/httpClient", () => ({
  api: { get, post },
}));

import { bulkAssignShifts, getShiftAssignmentGrid } from "./workScheduleApi";

describe("monthly shift-assignment API", () => {
  beforeEach(() => {
    get.mockReset();
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

  it("submits one atomic bulk assignment instead of creating employee assignments in the browser", async () => {
    const payload = {
      month: 8,
      year: 2026,
      unitId: "unit-01",
      employeeIds: ["employee-01", "employee-02"],
      shiftId: "shift-hc1",
      effectiveFrom: "2026-08-01",
      effectiveTo: "2026-08-31",
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
});
