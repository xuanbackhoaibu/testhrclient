import { useQuery } from '@tanstack/react-query';
import { getRoles } from './authAdminApi';

const FALLBACK_ROLES = [
  { name: 'EMPLOYEE', label: 'Employee', isSensitive: false },
  { name: 'HR_ADMIN', label: 'HR Admin', isSensitive: false },
  { name: 'HR', label: 'HR', isSensitive: false },
  { name: 'ADMIN', label: 'Admin', isSensitive: false },
  { name: 'BAN_LANH_DAO', label: 'Ban lãnh đạo', isSensitive: false },
  { name: 'BAN_LANH_DAO_DON_VI', label: 'Ban lãnh đạo đơn vị', isSensitive: false },
  { name: 'SUPER_ADMIN', label: 'Super Admin ⚠️', isSensitive: true },
];

export function useAvailableRoles() {
  const { data, isLoading } = useQuery({
    queryKey: ['auth-admin-roles'],
    queryFn: getRoles,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const roles = data?.length ? data : FALLBACK_ROLES;

  return {
    roles,
    isLoading,
    asSelectOptions: roles.map((r) => ({ label: r.label, value: r.name })),
  };
}
