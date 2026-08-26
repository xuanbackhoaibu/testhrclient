import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, upload, download } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
}));

vi.mock("../../shared/api/httpClient", () => ({
  api: { get, post, upload, download },
}));

import {
  adjustAnnualLeaveBalance,
  commitAnnualLeaveImport,
  downloadAnnualLeaveExport,
  downloadAnnualLeaveImportErrors,
  downloadAnnualLeaveTemplate,
  getAnnualLeaveLedger,
  listAnnualLeaveBalances,
  previewAnnualLeaveImport,
} from "./annualLeaveApi";

describe("annual leave balance API contract", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    upload.mockReset();
    download.mockReset();
  });

  it("keeps list and export on the same year and scope filters", async () => {
    const query = {
      year: 2026,
      page: 2,
      pageSize: 50,
      unitId: "unit-1",
      departmentId: "department-2",
      search: "001",
      reconciliationStatus: "RECONCILED" as const,
    };
    get.mockResolvedValue({ data: [], pagination: {} });
    download.mockResolvedValue(undefined);

    await listAnnualLeaveBalances(query);
    await downloadAnnualLeaveExport(query);

    expect(get).toHaveBeenCalledWith("/leave/annual-balances", {
      params: query,
    });
    expect(download).toHaveBeenCalledWith(
      "/leave/annual-balances/export",
      "Bang_phep_nam_2026.xlsx",
      query,
    );
  });

  it("normalizes the deployed items collection so employee rows render", async () => {
    const row = { employeeId: "employee-1" };
    const pagination = {
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    get.mockResolvedValue({ items: [row], pagination });

    await expect(
      listAnnualLeaveBalances({ year: 2026, page: 1, pageSize: 20 }),
    ).resolves.toEqual({ data: [row], pagination });
  });

  it("uses a two-step preview and commit flow with downloadable errors", async () => {
    const file = new File(["xlsx"], "bang-phep.xlsx");
    upload.mockResolvedValue({ batchId: "batch-1" });
    post.mockResolvedValue({ status: "COMMITTED", committedRows: 1 });
    download.mockResolvedValue(undefined);

    await downloadAnnualLeaveTemplate(2026);
    await previewAnnualLeaveImport(file, 2026);
    await downloadAnnualLeaveImportErrors("batch-1", 2026);
    await commitAnnualLeaveImport("batch-1", {
      allowWarnings: true,
      note: "Đã đối chiếu",
    });

    expect(upload).toHaveBeenCalledWith(
      "/leave/annual-balances/imports/preview?year=2026",
      file,
    );
    expect(post).toHaveBeenCalledWith(
      "/leave/annual-balances/imports/batch-1/commit",
      { allowWarnings: true, note: "Đã đối chiếu" },
    );
    expect(download).toHaveBeenCalledWith(
      "/leave/annual-balances/imports/batch-1/errors",
      "Loi_import_bang_phep_nam_2026.xlsx",
    );
  });

  it("reads and adjusts the employee ledger through dedicated endpoints", async () => {
    get.mockResolvedValue([]);
    post.mockResolvedValue({});

    await getAnnualLeaveLedger("employee-1", 2026);
    await adjustAnnualLeaveBalance("employee-1", 2026, {
      daysDelta: 0.5,
      note: "Biên bản 01",
    });

    expect(get).toHaveBeenCalledWith(
      "/leave/annual-balances/employee-1/ledger",
      { params: { year: 2026 } },
    );
    expect(post).toHaveBeenCalledWith(
      "/leave/annual-balances/employee-1/adjustments",
      { daysDelta: 0.5, note: "Biên bản 01" },
      { params: { year: 2026 } },
    );
  });
});
