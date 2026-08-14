import type { ReactNode } from 'react';
import { Breadcrumbs, Group, Stack, Text, Title } from '@mantine/core';
import { useLocation } from 'react-router-dom';

import { ROUTES } from '../constants/routes';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: string[];
  /** Use on dense operational screens such as monthly timesheets. */
  compact?: boolean;
}

const shellHeaderRoutes = new Set<string>([
  ROUTES.dashboard,
  ROUTES.employees,
  ROUTES.businessSectors,
  ROUTES.units,
  ROUTES.departments,
  ROUTES.positions,
  ROUTES.movements,
  ROUTES.contracts,
  ROUTES.leave,
  ROUTES.attendance,
  ROUTES.attendanceMapping,
  ROUTES.timesheetGrid,
  ROUTES.timesheetPeriods,
  ROUTES.workShifts,
  ROUTES.holidays,
  ROUTES.shiftAssignments,
  ROUTES.calendar,
  ROUTES.onboarding,
  ROUTES.offboarding,
  ROUTES.imports,
  ROUTES.auditLogs,
  ROUTES.settings,
  ROUTES.accounts,
  ROUTES.pendingHrLinkAccounts,
  ROUTES.roles,
  ROUTES.permissionGroups,
  ROUTES.permissions,
  ROUTES.workReportAuthorizations,
]);

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  compact = false,
}: PageHeaderProps) {
  const location = useLocation();
  const deferTitleToShell = shellHeaderRoutes.has(location.pathname);

  if (deferTitleToShell) {
    if (!subtitle && !breadcrumbs?.length && !actions) return null;

    return (
      <div className={`page-header ${compact ? "is-compact" : ""}`}>
        <Stack gap={compact ? 2 : 4}>
          {breadcrumbs?.length ? (
            <Breadcrumbs fz={compact ? "xs" : "sm"}>
              {breadcrumbs.map((item) => (
                <Text key={item} c="dimmed" inherit>
                  {item}
                </Text>
              ))}
            </Breadcrumbs>
          ) : null}
          {subtitle ? (
            <Text c="dimmed" size={compact ? "xs" : "sm"} maw={720}>
              {subtitle}
            </Text>
          ) : null}
        </Stack>
        {actions ? <Group gap="xs" wrap="nowrap" className="page-header-actions">{actions}</Group> : null}
      </div>
    );
  }

  return (
    <div className={`page-header ${compact ? "is-compact" : ""}`}>
      <Stack gap={compact ? 2 : 4}>
        {breadcrumbs?.length ? (
          <Breadcrumbs fz={compact ? "xs" : "sm"}>
            {breadcrumbs.map((item) => (
              <Text key={item} c="dimmed" inherit>
                {item}
              </Text>
            ))}
          </Breadcrumbs>
        ) : null}
        <Title order={2} size={compact ? "h4" : "h3"}>
          {title}
        </Title>
        {subtitle ? (
          <Text c="dimmed" size={compact ? "xs" : "sm"} maw={720}>
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {actions ? <Group gap="xs" wrap="nowrap" className="page-header-actions">{actions}</Group> : null}
    </div>
  );
}
