import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { HR_PERMISSIONS } from '../features/auth/permissions';
import { AuthLayout } from '../layouts/AuthLayout';
import { MainLayout } from '../layouts/MainLayout';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
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
import { UnitsPage } from '../pages/organization/UnitsPage';
import { DepartmentsPage } from '../pages/organization/DepartmentsPage';
import { PositionsPage } from '../pages/organization/PositionsPage';
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
          <ProtectedRoute permissions={[HR_PERMISSIONS.READ]}>
            <EmployeesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/employees/:id',
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.READ]}>
            <EmployeeDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.units,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.READ]}>
            <UnitsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.departments,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.READ]}>
            <DepartmentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.positions,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.READ]}>
            <PositionsPage />
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.movements, element: <MovementsPage /> },
      { path: ROUTES.contracts, element: <ContractsPage /> },
      { path: ROUTES.leave, element: <LeavePage /> },
      { path: ROUTES.attendance, element: <AttendancePage /> },
      { path: ROUTES.onboarding, element: <OnboardingPage /> },
      { path: ROUTES.offboarding, element: <OffboardingPage /> },
      {
        path: ROUTES.imports,
        element: (
          <ProtectedRoute permissions={[HR_PERMISSIONS.IMPORT]}>
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
          <ProtectedRoute permissions={[HR_PERMISSIONS.READ]}>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <Navigate to={ROUTES.dashboard} replace /> },
    ],
  },
]);
