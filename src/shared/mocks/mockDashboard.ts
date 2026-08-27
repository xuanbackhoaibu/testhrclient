import type { DashboardSummary } from '../../features/dashboard/dashboardTypes';
import { mockEmployees } from './mockEmployees';
import { mockUnits } from './mockOrganization';
import { mockLeaveRequests, mockMovements, mockOffboardingInstances, mockOnboardingInstances } from './mockWorkflows';

export function getMockDashboardSummary(): DashboardSummary {
  return {
    totalEmployees: mockEmployees.length,
    activeEmployees: mockEmployees.filter((employee) => employee.employmentStatus === 'ACTIVE').length,
    newHiresThisMonth: 3,
    terminatedThisMonth: 1,
    pendingLeaveRequests: mockLeaveRequests.filter((item) => item.status === 'SUBMITTED').length,
    pendingMovements: mockMovements.filter((item) => item.status === 'SUBMITTED').length,
    onboardingInProgress: mockOnboardingInstances.filter((item) => item.status === 'IN_PROGRESS').length,
    offboardingInProgress: mockOffboardingInstances.filter((item) => item.status === 'IN_PROGRESS').length,
    pendingAttendanceExplanations: 4,
    employeesByUnit: mockUnits.map((entity) => ({
      label: entity.shortName,
      value: mockEmployees.filter((employee) => employee.currentEmployeeAssignment?.unitId === entity.id).length,
    })),
    employeesByEmploymentStatus: ['ACTIVE', 'PROBATION', 'INACTIVE', 'TERMINATED'].map((status) => ({
      label: status,
      value: mockEmployees.filter((employee) => employee.employmentStatus === status).length,
    })),
    attendanceThisMonth: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      topLateEmployees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'HC001',
          fullName: 'Nguyen Van An',
          unitName: 'Van phong',
          departmentName: 'HCNS',
          lateCount: 3,
          totalLateMinutes: 42,
        },
        {
          employeeId: 'emp-2',
          employeeCode: 'KD002',
          fullName: 'Tran Thi Binh',
          unitName: 'Kinh doanh',
          departmentName: 'Sales',
          lateCount: 2,
          totalLateMinutes: 25,
        },
      ],
      byUnit: [
        { unitName: 'Van phong', workDays: 120, attendedDays: 116, attendanceRate: 96.7 },
        { unitName: 'Kinh doanh', workDays: 90, attendedDays: 84, attendanceRate: 93.3 },
      ],
      byDepartment: [
        { departmentName: 'HCNS', workDays: 42, attendedDays: 41, attendanceRate: 97.6 },
        { departmentName: 'Sales', workDays: 76, attendedDays: 70, attendanceRate: 92.1 },
      ],
      annualLeaveDaysUsed: 8.5,
      leaveBalanceMode: 'PENDING_HR_CSV_RECONCILIATION',
    },
    payrollHandoff: {
      closedPeriods: 1,
      latestClosedPeriod: { id: 'period-1', month: 7, year: 2026, status: 'CLOSED' },
      formatStatus: 'PENDING_PAYROLL_FORMAT_CONFIRMATION',
    },
    leaveExpiryRisks: {
      status: 'PENDING_HR_CSV_RECONCILIATION',
      items: [],
      message: 'Chua hien thi phep sap het han cho toi khi HR doi chieu xong quy phep Excel/CSV.',
    },
  };
}
