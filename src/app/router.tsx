import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AUTH_ADMIN_PERMISSIONS, HR_PERMISSIONS } from '../features/auth/permissions';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { AttendanceMappingPage } from '../pages/attendance/AttendanceMappingPage';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { CalendarPage } from '../pages/calendar/CalendarPage';
import { ContractsPage } from '../pages/contracts/ContractsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EmployeeDetailPage } from '../pages/employees/EmployeeDetailPage';
import { EmployeesPage } from '../pages/employees/EmployeesPage';
import { ImportsPage } from '../pages/imports/ImportsPage';
import { LeavePage } from '../pages/leave/LeavePage';
import { LoginPage } from '../pages/LoginPage';
import { MovementsPage } from '../pages/movements/MovementsPage';
import { OffboardingPage } from '../pages/offboarding/OffboardingPage';
import { OnboardingPage } from '../pages/onboarding/OnboardingPage';
import { AccountsPage } from '../pages/accounts/AccountsPage';
import { PendingHrLinkAccountsPage } from '../pages/accounts/PendingHrLinkAccountsPage';
import { RolesPage } from '../pages/roles/RolesPage';
import { PermissionsPage } from '../pages/permissions/PermissionsPage';
import { PermissionGroupsPage } from '../pages/permission-groups/PermissionGroupsPage';
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
      { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      {
        path: ROUTES.employees,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.EMPLOYEE_READ]}>
            <EmployeesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/employees/:id',
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.EMPLOYEE_READ]}>
            <EmployeeDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.businessSectors,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.BUSINESS_SECTOR_READ]}>
            <BusinessSectorsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.units,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.UNIT_READ]}>
            <UnitsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.departments,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.DEPARTMENT_READ]}>
            <DepartmentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.positions,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.POSITION_READ]}>
            <PositionsPage />
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.movements, element: <MovementsPage /> },
      { path: ROUTES.contracts, element: <ContractsPage /> },
      { path: ROUTES.leave, element: <LeavePage /> },
      {
        path: ROUTES.attendance,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.ATTENDANCE_READ]}>
            <AttendancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.attendanceMapping,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.ATTENDANCE_READ]}>
            <AttendanceMappingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.calendar,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.CALENDAR_READ]}>
            <CalendarPage />
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.onboarding, element: <OnboardingPage /> },
      { path: ROUTES.offboarding, element: <OffboardingPage /> },
      {
        path: ROUTES.imports,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.EMPLOYEE_IMPORT]}>
            <ImportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.auditLogs,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.AUDIT_READ]}>
            <AuditLogsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.settings,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.EMPLOYEE_READ]}>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.accounts,
        element: (
          <ProtectedRoute permissions={[AUTH_ADMIN_PERMISSIONS.USERS_READ]}>
            <AccountsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.pendingHrLinkAccounts,
        element: (
          <ProtectedRoute permissions={[AUTH_ADMIN_PERMISSIONS.USERS_READ]}>
            <PendingHrLinkAccountsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.roles,
        element: (
          <ProtectedRoute permissions={[AUTH_ADMIN_PERMISSIONS.ROLES_READ]}>
            <RolesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.permissions,
        element: (
          <ProtectedRoute permissions={[AUTH_ADMIN_PERMISSIONS.PERMISSIONS_READ]}>
            <PermissionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.permissionGroups,
        element: (
          <ProtectedRoute permissions={[AUTH_ADMIN_PERMISSIONS.PERMISSION_GROUPS_READ]}>
            <PermissionGroupsPage />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <Navigate to={ROUTES.dashboard} replace /> },
    ],
  },
]);
