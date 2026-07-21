import { useAuth } from '../../auth/useAuth';
import { getAuthorizationCapabilities } from '../authorizationCapabilities';

/**
 * UI navigation/action guard only. The Auth service remains authoritative for
 * every mutation and for which concrete role, permission or scope is grantable.
 */
export function useAuthorizationCapabilities() {
  const { can } = useAuth();
  return getAuthorizationCapabilities(can);
}
