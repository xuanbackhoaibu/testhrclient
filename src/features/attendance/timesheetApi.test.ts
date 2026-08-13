import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, downloadToSelectedLocation } = vi.hoisted(() => ({
  get: vi.fn(),
  downloadToSelectedLocation: vi.fn(),
}));

vi.mock("../../shared/api/httpClient", () => ({
  api: { get, downloadToSelectedLocation },
}));

import {
  downloadTimesheetGridExport,
  getTimesheetGrid,
} from "./timesheetApi";

describe("timesheet grid export query", () => {
  beforeEach(() => {
    get.mockReset();
    downloadToSelectedLocation.mockReset();
  });

  it("uses the same active period and scope filters as the visible grid", async () => {
    const activeGridQuery = {
      month: 8,
      year: 2026,
      employeeId: "employee-17",
      departmentIds: ["department-02", "department-07"],
      unitIds: ["unit-01", "unit-03"],
    };
    const expectedParams = {
      ...activeGridQuery,
      departmentIds: "department-02,department-07",
      unitIds: "unit-01,unit-03",
    };

    get.mockResolvedValue({ rows: [] });
    downloadToSelectedLocation.mockResolvedValue({
      status: "saved",
      filename: "bang-cham-cong-2026-08.xlsx",
    });

    await getTimesheetGrid(activeGridQuery);
    await downloadTimesheetGridExport(activeGridQuery);

    expect(get).toHaveBeenCalledWith("/attendance/timesheet/grid", {
      params: expectedParams,
    });
    expect(downloadToSelectedLocation).toHaveBeenCalledWith(
      "/attendance/timesheet/export",
      "bang-cham-cong-2026-08.xlsx",
      expectedParams,
    );
  });
});
