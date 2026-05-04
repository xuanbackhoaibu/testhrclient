import type { AuthUser, ScopeClaim } from './types';

export const CURRENT_USER_QUERY_KEY = ['me'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => readString(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

function normalizeScope(scope: unknown): ScopeClaim | null {
  if (!isRecord(scope)) {
    return null;
  }

  const system = readString(scope.system) ?? 'hr';
  const scopeType = readString(scope.scopeType);
  if (!scopeType) {
    return null;
  }

  return {
    system,
    scopeType,
    resourceType: readString(scope.resourceType),
    resourceIds: toStringArray(scope.resourceIds),
    unitId: readString(scope.unitId),
    unitIds: toStringArray(scope.unitIds),
    departmentId: readString(scope.departmentId),
    departmentIds: toStringArray(scope.departmentIds),
  };
}

function normalizeScopes(value: unknown): ScopeClaim[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeScope(item))
    .filter((item): item is ScopeClaim => Boolean(item));
}

function normalizeDataScopes(
  value: unknown,
  scopes: ScopeClaim[],
): AuthUser['dataScopes'] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!isRecord(item)) {
          return null;
        }

        const scopeType = readString(item.scopeType);
        if (!scopeType) {
          return null;
        }

        return {
          scopeType,
          unitId:
            readString(item.unitId) ??
            (Array.isArray(item.unitIds) ? readString(item.unitIds[0]) : null) ??
            null,
          departmentId:
            readString(item.departmentId) ??
            (Array.isArray(item.departmentIds)
              ? readString(item.departmentIds[0])
              : null) ??
            null,
        };
      })
      .filter(
        (
          item,
        ): item is {
          scopeType: string;
          unitId: string | null;
          departmentId: string | null;
        } => Boolean(item),
      );
  }

  return scopes.map((scope) => ({
    scopeType: scope.scopeType,
    unitId: scope.unitIds?.[0] ?? scope.unitId ?? null,
    departmentId: scope.departmentIds?.[0] ?? scope.departmentId ?? null,
  }));
}

function normalizeEmployee(value: unknown): AuthUser['employee'] {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const employeeCode = readString(value.employeeCode);
  const fullName = readString(value.fullName);

  if (!id || !employeeCode || !fullName) {
    return null;
  }

  return {
    id,
    employeeCode,
    fullName,
    unitId: readString(value.unitId) ?? null,
    departmentId: readString(value.departmentId) ?? null,
    positionId: readString(value.positionId) ?? null,
  };
}

function extractCurrentUserPayload(response: unknown): unknown {
  if (!isRecord(response)) {
    return response;
  }

  const levelOne = response.data;
  if (isRecord(levelOne) && isRecord(levelOne.data)) {
    return levelOne.data;
  }

  if (levelOne !== undefined) {
    return levelOne;
  }

  return response;
}

export function normalizeCurrentUser(response: unknown): AuthUser {
  const payload = extractCurrentUserPayload(response);
  const data = isRecord(payload) ? payload : {};
  const scopes = normalizeScopes(data.scopes);

  const id = readString(data.id) ?? readString(data.userId) ?? '';
  const userId = readString(data.userId) ?? id;
  const externalAuthUserId =
    readString(data.externalAuthUserId) ??
    readString(data.authUserId) ??
    readString(data.auth_user_id) ??
    readString(data.authPrincipalUserId) ??
    '';

  return {
    id,
    userId,
    authUserId:
      readString(data.authUserId) ??
      readString(data.auth_user_id) ??
      readString(data.authPrincipalUserId) ??
      readString(data.externalAuthUserId),
    auth_user_id:
      readString(data.auth_user_id) ??
      readString(data.authUserId) ??
      readString(data.externalAuthUserId),
    authPrincipalUserId: readString(data.authPrincipalUserId),
    externalAuthUserId,
    email: readString(data.email) ?? '',
    fullName: readString(data.fullName) ?? '',
    accountStatus:
      readString(data.accountStatus) ??
      readString(data.account_status) ??
      'UNKNOWN',
    account_status:
      readString(data.account_status) ?? readString(data.accountStatus),
    employeeId: readString(data.employeeId) ?? null,
    employee: normalizeEmployee(data.employee),
    roles: toStringArray(data.roles),
    permissions: toStringArray(data.permissions),
    permissionVersion: readNumber(data.permissionVersion),
    tokenVersion: readNumber(data.tokenVersion),
    mustChangePassword: readBoolean(data.mustChangePassword),
    scopes,
    dataScopes: normalizeDataScopes(data.dataScopes, scopes),
  };
}
