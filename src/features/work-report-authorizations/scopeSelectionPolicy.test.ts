import assert from 'node:assert/strict';
import { test } from 'vitest';

import { departmentScopeLabel, toggleScopeAction, unitScopeLabel } from './scopeSelectionPolicy.ts';

test('duplicate department names retain canonical department and unit context', () => {
  assert.equal(departmentScopeLabel({
    departmentId: 'internal-only', departmentName: 'Ban Giám đốc', departmentCode: 'PB-BGD-02',
    unitId: 'internal-only', unitName: 'Hacom Lào Cai', unitCode: 'DV008', status: 'ACTIVE',
  }), 'Ban Giám đốc · PB-BGD-02 · Hacom Lào Cai (DV008)');
  assert.equal(unitScopeLabel({ unitId: 'internal-only', unitName: 'Hacom Holdings', unitCode: 'DV001', status: 'ACTIVE' }), 'Hacom Holdings (DV001)');
});

test('submit always adds read and removing read removes submit', () => {
  assert.deepEqual(toggleScopeAction([], 'SUBMIT'), ['READ', 'SUBMIT']);
  assert.deepEqual(toggleScopeAction(['READ', 'SUBMIT'], 'READ'), []);
});
