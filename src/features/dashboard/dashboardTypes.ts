export interface DashboardMetric {
  label: string;
  value: number;
}

export interface DashboardLateEmployee {
  employeeId: string;
  employeeCode?: string | null;
  fullName?: string | null;
  unitName?: string | null;
  departmentName?: string | null;
  lateCount: number;
  totalLateMinutes: number;
}

export interface DashboardAttendanceRate {
  unitName?: string;
  departmentName?: string;
  workDays: number;
  attendedDays: number;
  attendanceRate: number;
}

export interface DashboardAttendanceThisMonth {
  month: number;
  year: number;
  topLateEmployees: DashboardLateEmployee[];
  byUnit: DashboardAttendanceRate[];
  byDepartment: DashboardAttendanceRate[];
  annualLeaveDaysUsed: number;
  leaveBalanceMode: string;
}

export interface DashboardPayrollHandoff {
  closedPeriods: number;
  latestClosedPeriod: {
    id: string;
    month: number;
    year: number;
    status: string;
  } | null;
  formatStatus: string;
}

export interface DashboardLeaveExpiryRisks {
  status: string;
  items: Array<{
    employeeId: string;
    employeeCode?: string | null;
    fullName?: string | null;
    remainingDays: number;
    expiresAt: string;
  }>;
  message?: string;
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
  pendingAttendanceExplanations: number;
  employeesByUnit: DashboardMetric[];
  employeesByEmploymentStatus: DashboardMetric[];
  attendanceThisMonth: DashboardAttendanceThisMonth;
  payrollHandoff: DashboardPayrollHandoff;
  leaveExpiryRisks: DashboardLeaveExpiryRisks;
}
