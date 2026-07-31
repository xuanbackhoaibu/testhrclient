import assert from 'node:assert/strict';
import test from 'node:test';
import { compareByBusinessCode, sortByCode } from './sort.ts';

test('sortByCode uses natural, case-insensitive business-code order without mutation', () => {
  const values = [{ code: 'DV10' }, { code: 'DV2' }, { code: 'dv1' }, { code: 'HC9' }, { code: 'HC10' }];
  const sorted = sortByCode(values);
  assert.deepEqual(sorted.map((value) => value.code), ['dv1', 'DV2', 'DV10', 'HC9', 'HC10']);
  assert.deepEqual(values.map((value) => value.code), ['DV10', 'DV2', 'dv1', 'HC9', 'HC10']);
});

test('compareByBusinessCode puts coded records first and falls back to name', () => {
  const sorted = [
    { code: null, name: 'Zulu' },
    { code: 'DV2', name: 'Beta' },
    { code: 'dv2', name: 'Alpha' },
    { code: ' ', name: 'An' },
  ].sort(compareByBusinessCode);
  assert.deepEqual(sorted.map((value) => value.name), ['Alpha', 'Beta', 'An', 'Zulu']);
});
