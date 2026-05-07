import { useQuery } from '@tanstack/react-query';
import { getRoles } from './authAdminApi';
import type { RoleDefinition } from './authAdminTypes';

const FALLBACK_ROLES: RoleDefinition[] = [
  { key: 'EMPLOYEE', name: 'Employee', label: 'Employee', isSensitive: false },
  { key: 'HR_ADMIN', name: 'HR Admin', label: 'HR Admin', isSensitive: false },
  { key: 'HR', name: 'HR', label: 'HR', isSensitive: false },
  { key: 'ADMIN', name: 'Admin', label: 'Admin', isSensitive: false },
  { key: 'BAN_LANH_DAO', name: 'Ban lanh dao', label: 'Ban lanh dao', isSensitive: false },
  { key: 'BAN_LANH_DAO_DON_VI', name: 'Ban lanh dao don vi', label: 'Ban lanh dao don vi', isSensitive: false },
  { key: 'SUPER_ADMIN', name: 'Super Admin', label: 'Super Admin', isSensitive: true },
];

export function useAvailableRoles() {
  const { data = [], isLoading } = useQuery<RoleDefinition[]>({
    queryKey: ['auth-admin-roles'],
    queryFn: () => getRoles(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const roles = data.length ? data : FALLBACK_ROLES;

  return {
    roles,
    isLoading,
    asSelectOptions: roles.map((role) => ({
      label: role.label ?? role.name,
      value: role.key ?? role.name,
    })),
  };
}
