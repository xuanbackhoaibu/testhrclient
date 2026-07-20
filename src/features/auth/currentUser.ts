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

function normalizeNestedRef(
  value: unknown,
  extraKeys?: string[],
): { id: string; code: string; name: string; [k: string]: string | null } | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id);
  const code = readString(value.code);
  const name = readString(value.name);
  if (!id || !code || !name) return null;
  const result: { id: string; code: string; name: string; [k: string]: string | null } = { id, code, name };
  for (const key of extraKeys ?? []) {
    result[key] = readString(value[key]) ?? null;
  }
  return result;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item));
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

  const unitRef = normalizeNestedRef(value.unit, ['shortName', 'shortCode', 'taxCode']);
  const normalizedUnit = unitRef
    ? {
        id: unitRef.id,
        code: unitRef.code,
        name: unitRef.name,
        shortName: unitRef.shortName ?? unitRef.shortCode ?? null,
        taxCode: unitRef.taxCode ?? null,
      }
    : null;

  return {
    id,
    employeeCode,
    fullName,
    email: readString(value.email) ?? null,
    companyEmail: readString(value.companyEmail) ?? null,
    personalEmail: readString(value.personalEmail) ?? null,
    phone: readString(value.phone) ?? null,
    gender: readString(value.gender) ?? null,
    dateOfBirth: readString(value.dateOfBirth) ?? null,
    dateOfJoining: readString(value.dateOfJoining) ?? null,
    citizenIdMasked: readString(value.citizenIdMasked) ?? null,
    status: readString(value.status) ?? readString(value.employmentStatus) ?? null,
    employmentStatus: readString(value.employmentStatus) ?? readString(value.status) ?? null,
    unitId: readString(value.unitId) ?? null,
    departmentId: readString(value.departmentId) ?? null,
    positionId: readString(value.positionId) ?? null,
    businessSector: normalizeNestedRef(value.businessSector),
    unit: normalizedUnit,
    department: normalizeNestedRef(value.department),
    position: normalizeNestedRef(value.position),
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
  const identity = isRecord(data.identity) ? data.identity : null;
  if (!identity) {
    throw Object.assign(
      new Error('Canonical identity is missing from /auth/me response.'),
      { statusCode: 502, errorCode: 'AUTHORITY_CONTRACT_INVALID' },
    );
  }

  const authUserId =
    readString(identity.authUserId) ??
    readString(identity.userId) ??
    readString(identity.sub);
  const accountStatus = readString(identity.accountStatus);
  if (!authUserId || !accountStatus) {
    throw Object.assign(
      new Error('Canonical identity fields are invalid.'),
      { statusCode: 502, errorCode: 'AUTHORITY_CONTRACT_INVALID' },
    );
  }

  const scopes = normalizeScopes(identity.scopes);

  const id = readString(data.id) ?? readString(data.userId) ?? '';
  const userId = readString(data.userId) ?? id;
  const externalAuthUserId = authUserId;

  return {
    id,
    userId,
    authUserId,
    auth_user_id: authUserId,
    authPrincipalUserId: readString(data.authPrincipalUserId),
    externalAuthUserId,
    email: readString(data.email) ?? '',
    username:
      readString(data.username) ??
      readString(data.loginIdentifier) ??
      readString(data.login_identifier) ??
      null,
    fullName: readString(data.fullName) ?? '',
    accountStatus,
    account_status: accountStatus,
    employeeId: readString(data.employeeId) ?? null,
    employee: normalizeEmployee(data.employee),
    roles: toStringArray(identity.roles),
    permissions: toStringArray(identity.permissions),
    permissionVersion: readNumber(identity.permissionVersion),
    tokenVersion: readNumber(identity.tokenVersion),
    authoritySource: 'chat-auth-runtime',
    mustChangePassword:
      readBoolean(identity.mustChangePassword) ?? readBoolean(data.mustChangePassword),
    identityWarnings: normalizeStringArray(data.identityWarnings),
    scopes,
    dataScopes: normalizeDataScopes(identity.dataScopes, scopes),
  };
}
