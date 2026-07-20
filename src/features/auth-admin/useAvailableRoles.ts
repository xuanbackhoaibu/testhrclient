import { useQuery } from '@tanstack/react-query';
import { getRoles } from './authAdminApi';
import type { RoleDefinition } from './authAdminTypes';

export function useAvailableRoles() {
  const { data = [], isLoading, error } = useQuery<RoleDefinition[]>({
    queryKey: ['auth-admin-roles'],
    queryFn: () => getRoles(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const roles = data.filter((role) => role.status !== 'disabled' && role.status !== 'inactive');

  return {
    roles,
    isLoading,
    error,
    asSelectOptions: roles.map((role) => ({
      label: role.label ?? role.name,
      value: role.key ?? role.name,
      disabled: role.isSensitive === true,
    })),
  };
}
