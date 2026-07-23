import type { BusinessAction, DepartmentOption, UnitOption } from './canonicalWorkReportAuthorizationsApi';

export const departmentScopeLabel = (scope: DepartmentOption) =>
  `${scope.departmentName} · ${scope.departmentCode} · ${scope.unitName} (${scope.unitCode})`;

export const unitScopeLabel = (scope: UnitOption) => `${scope.unitName} (${scope.unitCode})`;

/** Pure form-state rule: SUBMIT is never persisted without READ. */
export function toggleScopeAction(actions: BusinessAction[], action: BusinessAction): BusinessAction[] {
  const next = new Set(actions);
  if (next.has(action)) {
    next.delete(action);
    if (action === 'READ') next.delete('SUBMIT');
  } else {
    if (action === 'SUBMIT') next.add('READ');
    next.add(action);
  }
  return [...next].sort() as BusinessAction[];
}
