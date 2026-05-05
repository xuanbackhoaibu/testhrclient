export interface DashboardMetric {
  label: string;
  value: number;
}

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  newHiresThisMonth: number;
  terminatedThisMonth: number;
  pendingLeaveRequests: number;
  pendingMovements: number;
  onboardingInProgress: number;
  offboardingInProgress: number;
  employeesByLegalEntity: DashboardMetric[];
  employeesByEmploymentStatus: DashboardMetric[];
}

