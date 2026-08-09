import { api } from "../../shared/api/httpClient";
import { getMockDashboardSummary } from "../../shared/mocks/mockDashboard";
import { mockDelay } from "../../shared/mocks/mockHelpers";
import type {
  DashboardAttendanceRate,
  DashboardLateEmployee,
  DashboardLeaveExpiryRisks,
  DashboardMetric,
  DashboardPayrollHandoff,
  DashboardSummary,
} from "./dashboardTypes";

interface DashboardSummaryApiMetric {
  unitId?: string;
  unitName?: string;
  status?: string;
  label?: string;
  count?: number;
  value?: number;
}

interface DashboardSummaryApiResponse {
  totalEmployees?: number;
  activeEmployees?: number;
  newHiresThisMonth?: number;
  terminatedThisMonth?: number;
  pendingLeaveRequests?: number;
  pendingMovements?: number;
  onboardingInProgress?: number;
  offboardingInProgress?: number;
  pendingAttendanceExplanations?: number;
  employeesByUnit?: DashboardSummaryApiMetric[];
  employeesByEmploymentStatus?: DashboardSummaryApiMetric[];
  attendanceThisMonth?: {
    month?: number;
    year?: number;
    topLateEmployees?: DashboardLateEmployee[];
    byUnit?: DashboardAttendanceRate[];
    byDepartment?: DashboardAttendanceRate[];
    annualLeaveDaysUsed?: number;
    leaveBalanceMode?: string;
  };
  payrollHandoff?: DashboardPayrollHandoff;
  leaveExpiryRisks?: DashboardLeaveExpiryRisks;
}

const isMockMode = import.meta.env.VITE_USE_MOCKS === "true";

function toCount(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toDashboardMetric(
  metric: DashboardSummaryApiMetric,
  fallbackLabel: string,
): DashboardMetric {
  return {
    label: metric.unitName ?? metric.label ?? metric.status ?? fallbackLabel,
    value: toCount(metric.count ?? metric.value),
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (isMockMode) {
    await mockDelay();
    return getMockDashboardSummary();
  }

  const response =
    await api.get<DashboardSummaryApiResponse>("/dashboard/summary");

  return {
    totalEmployees: toCount(response.totalEmployees),
    activeEmployees: toCount(response.activeEmployees),
    newHiresThisMonth: toCount(response.newHiresThisMonth),
    terminatedThisMonth: toCount(response.terminatedThisMonth),
    pendingLeaveRequests: toCount(response.pendingLeaveRequests),
    pendingMovements: toCount(response.pendingMovements),
    onboardingInProgress: toCount(response.onboardingInProgress),
    offboardingInProgress: toCount(response.offboardingInProgress),
    pendingAttendanceExplanations: toCount(
      response.pendingAttendanceExplanations,
    ),
    employeesByUnit: (response.employeesByUnit ?? []).map((metric, index) =>
      toDashboardMetric(metric, `Don vi ${index + 1}`),
    ),
    employeesByEmploymentStatus: (
      response.employeesByEmploymentStatus ?? []
    ).map((metric, index) =>
      toDashboardMetric(metric, `Trang thai ${index + 1}`),
    ),
    attendanceThisMonth: {
      month: toCount(response.attendanceThisMonth?.month),
      year: toCount(response.attendanceThisMonth?.year),
      topLateEmployees: response.attendanceThisMonth?.topLateEmployees ?? [],
      byUnit: response.attendanceThisMonth?.byUnit ?? [],
      byDepartment: response.attendanceThisMonth?.byDepartment ?? [],
      annualLeaveDaysUsed: toCount(
        response.attendanceThisMonth?.annualLeaveDaysUsed,
      ),
      leaveBalanceMode:
        response.attendanceThisMonth?.leaveBalanceMode ??
        "PENDING_HR_CSV_RECONCILIATION",
    },
    payrollHandoff: response.payrollHandoff ?? {
      closedPeriods: 0,
      latestClosedPeriod: null,
      formatStatus: "PENDING_PAYROLL_FORMAT_CONFIRMATION",
    },
    leaveExpiryRisks: response.leaveExpiryRisks ?? {
      status: "PENDING_HR_CSV_RECONCILIATION",
      items: [],
      message:
        "Chua hien thi phep sap het han cho toi khi HR doi chieu xong quy phep Excel/CSV.",
    },
  };
}
