import { api } from "../../shared/api/httpClient";
import { getMockDashboardSummary } from "../../shared/mocks/mockDashboard";
import { mockDelay } from "../../shared/mocks/mockHelpers";
import type { DashboardMetric, DashboardSummary } from "./dashboardTypes";

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
  employeesByUnit?: DashboardSummaryApiMetric[];
  employeesByEmploymentStatus?: DashboardSummaryApiMetric[];
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
    employeesByUnit: (response.employeesByUnit ?? []).map((metric, index) =>
      toDashboardMetric(metric, `Đơn vị ${index + 1}`),
    ),
    employeesByEmploymentStatus: (
      response.employeesByEmploymentStatus ?? []
    ).map((metric, index) =>
      toDashboardMetric(metric, `Trạng thái ${index + 1}`),
    ),
  };
}
