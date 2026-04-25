import type { DashboardSummary } from '../../features/dashboard/dashboardTypes';
import { mockEmployees } from './mockEmployees';
import { mockLegalEntities } from './mockOrganization';
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
    employeesByLegalEntity: mockLegalEntities.map((entity) => ({
      label: entity.shortName,
      value: mockEmployees.filter((employee) => employee.currentAssignment.legalEntityId === entity.id).length,
    })),
    employeesByEmploymentStatus: ['ACTIVE', 'PROBATION', 'INACTIVE', 'TERMINATED'].map((status) => ({
      label: status,
      value: mockEmployees.filter((employee) => employee.employmentStatus === status).length,
    })),
  };
}

