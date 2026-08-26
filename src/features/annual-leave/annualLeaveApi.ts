import { api } from "../../shared/api/httpClient";
import { normalizePaginatedResponse } from "../../shared/api/response";
import { mockEmployees } from "../../shared/mocks/mockEmployees";
import type {
  AnnualLeaveImportPreview,
  AnnualLeaveLedgerItem,
  AnnualLeaveListResult,
  AnnualLeaveQuery,
  AnnualLeaveRow,
} from "./annualLeaveTypes";

const BASE = "/leave/annual-balances";
const maxListPageSize = 100;
const isMockMode = import.meta.env.VITE_USE_MOCKS === "true";

function queryParams(query: AnnualLeaveQuery): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

function mockRows(query: AnnualLeaveQuery): AnnualLeaveRow[] {
  const search = query.search?.trim().toLocaleLowerCase("vi");
  return mockEmployees
    .filter((employee) => {
      const assignment = employee.currentEmployeeAssignment;
      return (
        (!query.unitId || assignment?.unitId === query.unitId) &&
        (!query.departmentId ||
          assignment?.departmentId === query.departmentId) &&
        (!search ||
          employee.fullName.toLocaleLowerCase("vi").includes(search) ||
          employee.employeeCode.toLocaleLowerCase("vi").includes(search) ||
          employee.biotimeEmployeeCode
            ?.toLocaleLowerCase("vi")
            .includes(search))
      );
    })
    .map((employee, index) => {
      const monthlyUsed = Array.from({ length: 12 }, (_, month) =>
        month < 8 && (month + index) % 5 === 0 ? 0.5 : 0,
      );
      const usedCurrentYearDays = monthlyUsed.reduce<number>(
        (sum, value) => sum + value,
        0,
      );
      const carryOverDays = index % 4 === 0 ? 1.5 : 0;
      const accruedDays = 12;
      const seniorityDays = index % 6 === 0 ? 1 : 0;
      const otherDays = index % 8 === 0 ? 0.5 : 0;
      const hireDate = employee.hireDate || null;
      const status = hireDate
        ? index % 5 === 0
          ? "PENDING_HR_CSV_RECONCILIATION"
          : "RECONCILED"
        : "BLOCKED_MISSING_HIRE_DATE";
      return {
        sequence: index + 1,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        attendanceCode: employee.biotimeEmployeeCode ?? null,
        fullName: employee.fullName,
        hireDate,
        unit: employee.currentEmployeeAssignment
          ? {
              id: employee.currentEmployeeAssignment.unitId,
              name: employee.currentEmployeeAssignment.unitName,
            }
          : null,
        department: employee.currentEmployeeAssignment
          ? {
              id: employee.currentEmployeeAssignment.departmentId,
              name: employee.currentEmployeeAssignment.departmentName,
            }
          : null,
        year: query.year,
        carryOverDays,
        accruedDays,
        seniorityDays,
        otherDays,
        monthlyUsed,
        previousYearUsedDays: 2,
        usedCurrentYearDays,
        carryOverUsedDays: Math.min(carryOverDays, usedCurrentYearDays),
        carryOverExpiredDays: Math.max(
          0,
          carryOverDays - Math.min(carryOverDays, usedCurrentYearDays),
        ),
        remainingDays:
          carryOverDays +
          accruedDays +
          seniorityDays +
          otherDays -
          usedCurrentYearDays,
        reconciled: status === "RECONCILED",
        reconciliationStatus: status,
        warnings: [
          ...(!hireDate ? ["MISSING_HIRE_DATE"] : []),
          ...(!employee.biotimeEmployeeCode ? ["MISSING_ATTENDANCE_CODE"] : []),
        ],
      } satisfies AnnualLeaveRow;
    })
    .filter(
      (row) =>
        !query.reconciliationStatus ||
        row.reconciliationStatus === query.reconciliationStatus,
    );
}

export async function listAnnualLeaveBalances(
  query: AnnualLeaveQuery,
): Promise<AnnualLeaveListResult> {
  if (isMockMode) {
    const rows = mockRows(query);
    const start = (query.page - 1) * query.pageSize;
    const data = rows
      .slice(start, start + query.pageSize)
      .map((row, index) => ({
        ...row,
        sequence: start + index + 1,
      }));
    const totalPages = rows.length
      ? Math.ceil(rows.length / query.pageSize)
      : 0;
    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: rows.length,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }
  const response = await api.get<AnnualLeaveListResult>(BASE, {
    params: queryParams(query),
  });
  const normalized = normalizePaginatedResponse<AnnualLeaveRow>(
    response,
    query,
  );
  return { data: normalized.items, pagination: normalized.pagination };
}

export async function listAllAnnualLeaveBalances(
  query: AnnualLeaveQuery,
): Promise<AnnualLeaveListResult> {
  const firstPage = await listAnnualLeaveBalances({
    ...query,
    page: 1,
    pageSize: maxListPageSize,
  });
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.pagination.totalPages - 1) },
      (_, index) =>
        listAnnualLeaveBalances({
          ...query,
          page: index + 2,
          pageSize: maxListPageSize,
        }),
    ),
  );
  const data = [firstPage, ...remainingPages].flatMap((result) => result.data);
  return {
    data,
    pagination: {
      page: 1,
      pageSize: data.length || maxListPageSize,
      total: data.length,
      totalPages: data.length ? 1 : 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

export function downloadAnnualLeaveTemplate(year: number) {
  return api.download(
    `${BASE}/template`,
    `Mau_import_bang_phep_nam_${year}.xlsx`,
    { year },
  );
}

export function downloadAnnualLeaveExport(query: AnnualLeaveQuery) {
  return api.download(
    `${BASE}/export`,
    `Bang_phep_nam_${query.year}.xlsx`,
    queryParams(query),
  );
}

export function previewAnnualLeaveImport(file: File, year: number) {
  return api.upload<AnnualLeaveImportPreview>(
    `${BASE}/imports/preview?year=${year}`,
    file,
  );
}

export function downloadAnnualLeaveImportErrors(batchId: string, year: number) {
  return api.download(
    `${BASE}/imports/${batchId}/errors`,
    `Loi_import_bang_phep_nam_${year}.xlsx`,
  );
}

export function commitAnnualLeaveImport(
  batchId: string,
  payload: { allowWarnings: boolean; note?: string },
) {
  return api.post<{ status: string; committedRows: number }>(
    `${BASE}/imports/${batchId}/commit`,
    payload,
  );
}

export function getAnnualLeaveLedger(employeeId: string, year: number) {
  if (isMockMode) {
    return Promise.resolve<AnnualLeaveLedgerItem[]>([
      {
        id: `mock-carry-${employeeId}-${year}`,
        transactionType: "CARRY_OVER",
        daysDelta: 1.5,
        usableDelta: 1.5,
        occurredAt: `${year}-01-01T00:00:00.000Z`,
        source: "ANNUAL_LEAVE_IMPORT",
        sourceId: `${year}:${employeeId}:carry`,
        note: "Đối chiếu số phép kết chuyển đầu năm.",
        createdById: null,
      },
      {
        id: `mock-deduct-${employeeId}-${year}`,
        transactionType: "REQUEST_DEDUCT",
        daysDelta: -0.5,
        usableDelta: -0.5,
        occurredAt: `${year}-03-18T08:00:00.000Z`,
        source: "LEAVE_REQUEST",
        sourceId: `leave-${employeeId}`,
        note: "Đơn phép năm đã duyệt.",
        createdById: null,
      },
    ]);
  }
  return api.get<AnnualLeaveLedgerItem[]>(`${BASE}/${employeeId}/ledger`, {
    params: { year },
  });
}

export function adjustAnnualLeaveBalance(
  employeeId: string,
  year: number,
  payload: { daysDelta: number; note: string },
) {
  if (isMockMode) return Promise.resolve({ employeeId, year, ...payload });
  return api.post(`${BASE}/${employeeId}/adjustments`, payload, {
    params: { year },
  });
}
