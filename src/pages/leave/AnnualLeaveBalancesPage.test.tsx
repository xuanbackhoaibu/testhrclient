// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PreviewData = {
  batchId: string;
  year: number;
  totalRows: number;
  validRows: number;
  warningRows: number;
  failedRows: number;
  canCommit: boolean;
  requiresNote: boolean;
  alreadyProcessed?: boolean;
  status?: string;
  rows: Array<{
    rowNumber: number;
    status: "VALID" | "WARNING" | "ERROR";
    rawData: { attendanceCode?: string; fullName?: string };
    errors: Array<{ field: string; code: string; message: string }>;
    warnings: Array<{ field: string; code: string; message: string }>;
  }>;
};

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  previewData: undefined as PreviewData | undefined,
  preview: vi.fn(),
  previewReset: vi.fn(),
  commit: vi.fn(),
  commitReset: vi.fn(),
  adjust: vi.fn(),
  refetchBalances: vi.fn(),
  refetchLedger: vi.fn(),
  downloadTemplate: vi.fn(),
  downloadExport: vi.fn(),
  downloadErrors: vi.fn(),
}));

vi.mock("../../features/auth/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-hr",
      permissions: mocks.permissions,
      roles: [],
      accountStatus: "ACTIVE",
      authoritySource: "chat-auth-runtime",
      dataScopes: [],
    },
  }),
}));

vi.mock("../../features/organization/useUnits", () => ({
  useUnitsSelect: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../features/organization/useDepartments", () => ({
  useDepartmentsSelect: () => ({ data: [], isLoading: false }),
}));

vi.mock("../../features/annual-leave/useAnnualLeave", () => ({
  useAllAnnualLeaveBalances: () => ({
    data: {
      data: [
        {
          sequence: 1,
          employeeId: "emp-1",
          employeeCode: "HC0001",
          attendanceCode: "00108",
          fullName: "Nguyễn Văn Một",
          hireDate: "2020-01-02",
          unit: { id: "unit-1", name: "Công ty A" },
          department: { id: "dept-1", name: "Phòng Nhân sự" },
          year: 2026,
          carryOverDays: 2,
          accruedDays: 12,
          seniorityDays: 1,
          otherDays: 0.5,
          monthlyUsed: [1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          previousYearUsedDays: 3,
          usedCurrentYearDays: 1.5,
          carryOverUsedDays: 1.5,
          carryOverExpiredDays: 0.5,
          remainingDays: 13.5,
          reconciled: true,
          reconciliationStatus: "RECONCILED",
          warnings: [],
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mocks.refetchBalances,
  }),
  useAnnualLeaveImportPreview: () => ({
    data: mocks.previewData,
    mutateAsync: mocks.preview,
    reset: mocks.previewReset,
    isPending: false,
  }),
  useCommitAnnualLeaveImport: () => ({
    mutateAsync: mocks.commit,
    reset: mocks.commitReset,
    isPending: false,
  }),
  useAnnualLeaveLedger: () => ({
    data: [
      {
        id: "tx-1",
        transactionType: "CARRY_OVER",
        daysDelta: 2,
        usableDelta: 2,
        occurredAt: "2026-01-01T00:00:00.000Z",
        source: "ANNUAL_LEAVE_IMPORT",
        sourceId: "row-1",
        note: "Đối chiếu đầu năm",
        createdById: "user-hr",
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: mocks.refetchLedger,
  }),
  useAdjustAnnualLeaveBalance: () => ({
    mutateAsync: mocks.adjust,
    isPending: false,
  }),
}));

vi.mock("../../features/annual-leave/annualLeaveApi", () => ({
  downloadAnnualLeaveTemplate: mocks.downloadTemplate,
  downloadAnnualLeaveExport: mocks.downloadExport,
  downloadAnnualLeaveImportErrors: mocks.downloadErrors,
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

import { AnnualLeaveBalancesPage } from "./AnnualLeaveBalancesPage";

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

function renderPage() {
  return render(
    <MantineProvider>
      <AnnualLeaveBalancesPage />
    </MantineProvider>,
  );
}

function preview(overrides: Partial<PreviewData> = {}): PreviewData {
  return {
    batchId: "batch-1",
    year: 2026,
    totalRows: 1,
    validRows: 1,
    warningRows: 0,
    failedRows: 0,
    canCommit: true,
    requiresNote: false,
    rows: [],
    ...overrides,
  };
}

afterEach(cleanup);

beforeEach(() => {
  mocks.permissions = ["hr.leave_balance.read"];
  mocks.previewData = undefined;
  for (const mock of [
    mocks.preview,
    mocks.previewReset,
    mocks.commit,
    mocks.commitReset,
    mocks.adjust,
    mocks.refetchBalances,
    mocks.refetchLedger,
    mocks.downloadTemplate,
    mocks.downloadExport,
    mocks.downloadErrors,
  ]) {
    mock.mockReset();
  }
  mocks.commit.mockResolvedValue({ committedRows: 1 });
  mocks.adjust.mockResolvedValue(undefined);
  mocks.downloadErrors.mockResolvedValue(undefined);
});

describe("AnnualLeaveBalancesPage", () => {
  it("renders the HR/BioTime identity columns and keeps read-only users read-only", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole("heading", { name: /Bảng phép năm/ }),
    ).toBeDefined();
    for (const header of [
      "TT",
      "Họ và tên",
      "MCB",
      "Ngày bắt đầu làm việc",
      "T1",
      "T12",
    ]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeDefined();
    }
    expect(
      screen.queryByRole("columnheader", { name: "Phòng ban" }),
    ).toBeNull();
    expect(screen.getByText("00108")).toBeDefined();
    expect(screen.getByText("02/01/2020")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Import Excel" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xuất Excel" })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Mở sổ phép của Nguyễn Văn Một" }),
    );
    expect(await screen.findByText("Lịch sử phát sinh năm 2026")).toBeDefined();
    expect(screen.queryByText("Điều chỉnh số ngày đã nghỉ")).toBeNull();
  });

  it("records a used-leave correction in the selected month", async () => {
    const user = userEvent.setup();
    mocks.permissions = ["hr.leave_balance.read", "hr.leave_balance.update"];
    renderPage();

    await user.click(
      screen.getByRole("button", { name: "Mở sổ phép của Nguyễn Văn Một" }),
    );
    const drawer = await screen.findByRole("dialog");
    const selectedMonth = new Date().getMonth() + 1;
    expect(
      (
        within(drawer).getByRole("combobox", {
          name: "Tháng nghỉ",
        }) as HTMLInputElement
      ).value,
    ).toBe(`Tháng ${selectedMonth}`);
    await user.type(
      within(drawer).getByRole("textbox", { name: "Lý do điều chỉnh" }),
      "Bổ sung biên bản tháng 9",
    );
    await user.click(
      within(drawer).getByRole("button", { name: "Ghi vào sổ phép" }),
    );

    await waitFor(() =>
      expect(mocks.adjust).toHaveBeenCalledWith({
        employeeId: "emp-1",
        year: 2026,
        month: selectedMonth,
        daysDelta: 0.5,
        note: "Bổ sung biên bản tháng 9",
      }),
    );
  });

  it("uses one compact header row and keeps the monthly attendance palette", () => {
    renderPage();

    const table = screen.getByRole("table");
    expect(table.classList.contains("timesheet-bcc-table")).toBe(true);
    expect(screen.getByText("Hiển thị 1–1 / 1 CBNV")).toBeDefined();

    const nameHeader = screen.getByRole("columnheader", { name: "Họ và tên" });
    const identityColumns = [
      "TT",
      "Họ và tên",
      "MCB",
      "Ngày bắt đầu làm việc",
    ].map((header) => screen.getByRole("columnheader", { name: header }));
    const employeeRow = screen
      .getByRole("button", { name: "Mở sổ phép của Nguyễn Văn Một" })
      .closest("tr");
    const organizationRow = screen
      .getByText(/1\. Công ty A · Phòng Nhân sự/)
      .closest("tr");

    for (const removedHeader of [
      "Thông tin nhân sự",
      "Nguồn phép",
      "Đã nghỉ theo tháng",
      "Đối chiếu và số dư",
    ]) {
      expect(
        screen.queryByRole("columnheader", { name: removedHeader }),
      ).toBeNull();
    }
    expect(organizationRow?.children[0].getAttribute("colspan")).toBe("4");
    expect(organizationRow?.children[1].getAttribute("colspan")).toBe("21");
    expect(organizationRow?.textContent).toContain("(1 CBNV)");
    expect(nameHeader.style.top).toBe("0px");
    expect(nameHeader.style.background).toBe("rgb(230, 242, 223)");
    expect(
      identityColumns.map(({ style }) => ({
        left: style.left,
        width: style.width,
      })),
    ).toEqual([
      { left: "0px", width: "32px" },
      { left: "32px", width: "160px" },
      { left: "192px", width: "62px" },
      { left: "254px", width: "136px" },
    ]);
    expect(employeeRow).not.toBeNull();
    expect((employeeRow?.children[8] as HTMLElement).style.background).toBe(
      "rgb(255, 245, 157)",
    );
    expect(
      (employeeRow?.lastElementChild as HTMLElement).style.background,
    ).toBe("rgb(219, 234, 254)");
  });
  it("exports the filtered workbook exactly once for each click", async () => {
    const user = userEvent.setup();
    mocks.permissions = ["hr.leave_balance.read", "hr.leave_balance.export"];
    mocks.downloadExport.mockResolvedValue(undefined);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Xuất Excel" }));

    await waitFor(() => expect(mocks.downloadExport).toHaveBeenCalledTimes(1));
    expect(mocks.downloadExport).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, page: 1, pageSize: 20 }),
    );
  });

  it("explains when the same import batch is reused and prevents a committed replay", async () => {
    const user = userEvent.setup();
    mocks.permissions = ["hr.leave_balance.read", "hr.leave_balance.import"];
    mocks.previewData = preview({
      canCommit: false,
      alreadyProcessed: true,
      status: "COMMITTED",
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Import Excel" }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText("File này đã được import")).toBeDefined();
    expect(
      (
        within(modal).getByRole("button", {
          name: "Xác nhận import",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("requires a note in the modal before committing rows with other leave", async () => {
    const user = userEvent.setup();
    mocks.permissions = [
      "hr.leave_balance.read",
      "hr.leave_balance.import",
      "hr.leave_balance.export",
    ];
    mocks.previewData = preview({ requiresNote: true });
    renderPage();

    expect(screen.getByRole("button", { name: "Tải mẫu Excel" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Xuất Excel" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Import Excel" }));

    const modal = await screen.findByRole("dialog");
    const confirm = within(modal).getByRole("button", {
      name: "Xác nhận import",
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect(
      within(modal).getByText(/File có Số ngày phép khác; cần nhập lý do/),
    ).toBeDefined();

    await user.type(
      within(modal).getByRole("textbox", {
        name: /Lý do.*ghi chú đối chiếu/,
      }),
      "Biên bản bổ sung phép đặc biệt",
    );
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    await user.click(confirm);

    await waitFor(() =>
      expect(mocks.commit).toHaveBeenCalledWith({
        batchId: "batch-1",
        allowWarnings: false,
        note: "Biên bản bổ sung phép đặc biệt",
      }),
    );
  });

  it("blocks commit and offers the error workbook when preview contains errors", async () => {
    const user = userEvent.setup();
    mocks.permissions = ["hr.leave_balance.read", "hr.leave_balance.import"];
    mocks.previewData = preview({
      validRows: 0,
      failedRows: 1,
      canCommit: false,
      rows: [
        {
          rowNumber: 2,
          status: "ERROR",
          rawData: { attendanceCode: "999", fullName: "Ngoài phạm vi" },
          errors: [
            {
              field: "MCB",
              code: "EMPLOYEE_NOT_FOUND_OR_OUT_OF_SCOPE",
              message: "MCB không tồn tại hoặc nằm ngoài phạm vi.",
            },
          ],
          warnings: [],
        },
      ],
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Import Excel" }));
    const modal = await screen.findByRole("dialog");
    expect(
      within(modal).getByText("Cần sửa file trước khi import"),
    ).toBeDefined();
    expect(
      (
        within(modal).getByRole("button", {
          name: "Xác nhận import",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.click(
      within(modal).getByRole("button", { name: "Tải file lỗi" }),
    );

    expect(mocks.downloadErrors).toHaveBeenCalledWith("batch-1", 2026);
    expect(mocks.commit).not.toHaveBeenCalled();
  });
});
