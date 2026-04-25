export function hasRole(roles: string[] | undefined, requiredRole: string | string[]): boolean {
  if (!roles?.length) {
    return false;
  }

  const expected = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return expected.some((role) => roles.includes(role));
}

