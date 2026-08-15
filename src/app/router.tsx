import { createBrowserRouter } from 'react-router-dom';

import { AuthorizationLanding } from '../features/auth/AuthorizationLanding';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { AttendanceMappingPage } from '../pages/attendance/AttendanceMappingPage';
import { MonthlyTimesheetRosterPage } from '../pages/attendance/MonthlyTimesheetRosterPage';
import { TimesheetGridPage } from '../pages/attendance/TimesheetGridPage';
import { TimesheetPeriodsPage } from '../pages/attendance/TimesheetPeriodsPage';
import { WorkShiftsPage } from '../pages/attendance/WorkShiftsPage';
import { WeeklyShiftTemplatesPage } from '../pages/attendance/WeeklyShiftTemplatesPage';
import { HolidaysPage } from '../pages/attendance/HolidaysPage';
import { ShiftAssignmentsPage } from '../pages/attendance/ShiftAssignmentsPage';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { CalendarPage } from '../pages/calendar/CalendarPage';
import { ContractsPage } from '../pages/contracts/ContractsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EmployeeDetailPage } from '../pages/employees/EmployeeDetailPage';
import { EmployeesPage } from '../pages/employees/EmployeesPage';
import { ImportsPage } from '../pages/imports/ImportsPage';
import { LeavePage } from '../pages/leave/LeavePage';
import { LeaveApprovalAssignmentsPage } from '../pages/leave/LeaveApprovalAssignmentsPage';
import { LoginPage } from '../pages/LoginPage';
import { MovementsPage } from '../pages/movements/MovementsPage';
import { OffboardingPage } from '../pages/offboarding/OffboardingPage';
import { OnboardingPage } from '../pages/onboarding/OnboardingPage';
import { AccountsPage } from '../pages/accounts/AccountsPage';
import { PendingHrLinkAccountsPage } from '../pages/accounts/PendingHrLinkAccountsPage';
import { RolesPage } from '../pages/roles/RolesPage';
import { PermissionsPage } from '../pages/permissions/PermissionsPage';
import { PermissionGroupsPage } from '../pages/permission-groups/PermissionGroupsPage';
import { WorkReportAuthorizationsPage } from '../pages/work-report-authorizations/WorkReportAuthorizationsPage';
import { BusinessSectorsPage } from '../pages/organization/BusinessSectorsPage';
import { UnitsPage } from '../pages/organization/UnitsPage';
import { DepartmentsPage } from '../pages/organization/DepartmentsPage';
import { PositionsPage } from '../pages/organization/PositionsPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { ROUTES } from '../shared/constants/routes';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.authCallback, element: <AuthCallbackPage /> },
      { path: ROUTES.changePassword, element: <ChangePasswordPage /> },
    ],
  },
  {
    path: ROUTES.root,
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AuthorizationLanding /> },
      { path: ROUTES.dashboard, element: <ProtectedRoute route={ROUTES.dashboard}><DashboardPage /></ProtectedRoute> },
      {
        path: ROUTES.employees,
        element: (
          <ProtectedRoute route={ROUTES.employees}>
            <EmployeesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/employees/:id',
        element: (
          <ProtectedRoute route="/employees/:id">
            <EmployeeDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.businessSectors,
        element: (
          <ProtectedRoute route={ROUTES.businessSectors}>
            <BusinessSectorsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.units,
        element: (
          <ProtectedRoute route={ROUTES.units}>
            <UnitsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.departments,
        element: (
          <ProtectedRoute route={ROUTES.departments}>
            <DepartmentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.positions,
        element: (
          <ProtectedRoute route={ROUTES.positions}>
            <PositionsPage />
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.movements, element: <ProtectedRoute route={ROUTES.movements}><MovementsPage /></ProtectedRoute> },
      { path: ROUTES.contracts, element: <ProtectedRoute route={ROUTES.contracts}><ContractsPage /></ProtectedRoute> },
      { path: ROUTES.leave, element: <ProtectedRoute route={ROUTES.leave}><LeavePage /></ProtectedRoute> },
      { path: ROUTES.leaveApprovalAssignments, element: <ProtectedRoute route={ROUTES.leaveApprovalAssignments}><LeaveApprovalAssignmentsPage /></ProtectedRoute> },
      {
        path: ROUTES.attendance,
        element: (
          <ProtectedRoute route={ROUTES.attendance}>
            <AttendancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.attendanceMapping,
        element: (
          <ProtectedRoute route={ROUTES.attendanceMapping}>
            <AttendanceMappingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.weeklyShifts,
        element: (
          <ProtectedRoute route={ROUTES.weeklyShifts}>
            <WeeklyShiftTemplatesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.monthlyTimesheetRoster,
        element: (
          <ProtectedRoute route={ROUTES.monthlyTimesheetRoster}>
            <MonthlyTimesheetRosterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.timesheetGrid,
        element: (
          <ProtectedRoute route={ROUTES.timesheetGrid}>
            <TimesheetGridPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.timesheetPeriods,
        element: (
          <ProtectedRoute route={ROUTES.timesheetPeriods}>
            <TimesheetPeriodsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.workShifts,
        element: (
          <ProtectedRoute route={ROUTES.workShifts}>
            <WorkShiftsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.holidays,
        element: (
          <ProtectedRoute route={ROUTES.holidays}>
            <HolidaysPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.shiftAssignments,
        element: (
          <ProtectedRoute route={ROUTES.shiftAssignments}>
            <ShiftAssignmentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.calendar,
        element: (
          <ProtectedRoute route={ROUTES.calendar}>
            <CalendarPage />
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.onboarding, element: <ProtectedRoute route={ROUTES.onboarding}><OnboardingPage /></ProtectedRoute> },
      { path: ROUTES.offboarding, element: <ProtectedRoute route={ROUTES.offboarding}><OffboardingPage /></ProtectedRoute> },
      {
        path: ROUTES.imports,
        element: (
          <ProtectedRoute route={ROUTES.imports}>
            <ImportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.auditLogs,
        element: (
          <ProtectedRoute route={ROUTES.auditLogs}>
            <AuditLogsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.settings,
        element: (
          <ProtectedRoute route={ROUTES.settings}>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.accounts,
        element: (
          <ProtectedRoute route={ROUTES.accounts}>
            <AccountsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.pendingHrLinkAccounts,
        element: (
          <ProtectedRoute route={ROUTES.pendingHrLinkAccounts}>
            <PendingHrLinkAccountsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.roles,
        element: (
          <ProtectedRoute route={ROUTES.roles}>
            <RolesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.permissions,
        element: (
          <ProtectedRoute route={ROUTES.permissions}>
            <PermissionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.permissionGroups,
        element: (
          <ProtectedRoute route={ROUTES.permissionGroups}>
            <PermissionGroupsPage />
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.workReportAuthorizations, element: <ProtectedRoute route={ROUTES.workReportAuthorizations}><WorkReportAuthorizationsPage /></ProtectedRoute> },
      { path: '*', element: <AuthorizationLanding /> },
    ],
  },
]);
