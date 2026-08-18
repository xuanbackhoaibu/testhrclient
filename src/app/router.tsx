import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { AuthorizationLanding } from '../features/auth/AuthorizationLanding';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { LoginPage } from '../pages/LoginPage';
import { ChangePasswordPage } from '../pages/ChangePasswordPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { ROUTES } from '../shared/constants/routes';

const AttendancePage = lazy(() => import('../pages/attendance/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const AttendanceMappingPage = lazy(() => import('../pages/attendance/AttendanceMappingPage').then((m) => ({ default: m.AttendanceMappingPage })));
const MonthlyTimesheetRosterPage = lazy(() => import('../pages/attendance/MonthlyTimesheetRosterPage').then((m) => ({ default: m.MonthlyTimesheetRosterPage })));
const TimesheetGridPage = lazy(() => import('../pages/attendance/TimesheetGridPage').then((m) => ({ default: m.TimesheetGridPage })));
const TimesheetPeriodsPage = lazy(() => import('../pages/attendance/TimesheetPeriodsPage').then((m) => ({ default: m.TimesheetPeriodsPage })));
const WorkShiftsPage = lazy(() => import('../pages/attendance/WorkShiftsPage').then((m) => ({ default: m.WorkShiftsPage })));
const WeeklyShiftTemplatesPage = lazy(() => import('../pages/attendance/WeeklyShiftTemplatesPage').then((m) => ({ default: m.WeeklyShiftTemplatesPage })));
const HolidaysPage = lazy(() => import('../pages/attendance/HolidaysPage').then((m) => ({ default: m.HolidaysPage })));
const ShiftAssignmentsPage = lazy(() => import('../pages/attendance/ShiftAssignmentsPage').then((m) => ({ default: m.ShiftAssignmentsPage })));
const AuditLogsPage = lazy(() => import('../pages/audit/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const CalendarPage = lazy(() => import('../pages/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const ContractsPage = lazy(() => import('../pages/contracts/ContractsPage').then((m) => ({ default: m.ContractsPage })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const EmployeeDetailPage = lazy(() => import('../pages/employees/EmployeeDetailPage').then((m) => ({ default: m.EmployeeDetailPage })));
const EmployeesPage = lazy(() => import('../pages/employees/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const ImportsPage = lazy(() => import('../pages/imports/ImportsPage').then((m) => ({ default: m.ImportsPage })));
const LeavePage = lazy(() => import('../pages/leave/LeavePage').then((m) => ({ default: m.LeavePage })));
const LeaveApprovalAssignmentsPage = lazy(() => import('../pages/leave/LeaveApprovalAssignmentsPage').then((m) => ({ default: m.LeaveApprovalAssignmentsPage })));
const MovementsPage = lazy(() => import('../pages/movements/MovementsPage').then((m) => ({ default: m.MovementsPage })));
const OffboardingPage = lazy(() => import('../pages/offboarding/OffboardingPage').then((m) => ({ default: m.OffboardingPage })));
const OnboardingPage = lazy(() => import('../pages/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const AccountsPage = lazy(() => import('../pages/accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })));
const PendingHrLinkAccountsPage = lazy(() => import('../pages/accounts/PendingHrLinkAccountsPage').then((m) => ({ default: m.PendingHrLinkAccountsPage })));
const RolesPage = lazy(() => import('../pages/roles/RolesPage').then((m) => ({ default: m.RolesPage })));
const PermissionsPage = lazy(() => import('../pages/permissions/PermissionsPage').then((m) => ({ default: m.PermissionsPage })));
const PermissionGroupsPage = lazy(() => import('../pages/permission-groups/PermissionGroupsPage').then((m) => ({ default: m.PermissionGroupsPage })));
const WorkReportAuthorizationsPage = lazy(() => import('../pages/work-report-authorizations/WorkReportAuthorizationsPage').then((m) => ({ default: m.WorkReportAuthorizationsPage })));
const BusinessSectorsPage = lazy(() => import('../pages/organization/BusinessSectorsPage').then((m) => ({ default: m.BusinessSectorsPage })));
const UnitsPage = lazy(() => import('../pages/organization/UnitsPage').then((m) => ({ default: m.UnitsPage })));
const DepartmentsPage = lazy(() => import('../pages/organization/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })));
const PositionsPage = lazy(() => import('../pages/organization/PositionsPage').then((m) => ({ default: m.PositionsPage })));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));


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
