import assert from 'node:assert/strict';
import { test } from 'vitest';
import { filterSelectOptions } from './filterSelectOptions.ts';
import { normalizeSearchText } from './normalizeSearchText.ts';

test('filterSelectOptions matches Vietnamese labels without mutating labels or grouped input', () => {
  const options = [
    { value: 'dv001', label: 'DV001 — Đơn vị Công nghệ' },
    { group: 'Phòng ban', items: [{ value: 'pb010', label: 'PB010 — Phòng Kế toán' }] },
  ];

  const filtered = filterSelectOptions({ options, search: 'cong nghe', limit: Infinity });

  assert.deepEqual(filtered, [{ value: 'dv001', label: 'DV001 — Đơn vị Công nghệ' }]);
  assert.equal(options[0].label, 'DV001 — Đơn vị Công nghệ');
  assert.equal(options[1].items[0].label, 'PB010 — Phòng Kế toán');
});

test('filterSelectOptions preserves grouping and applies a global result limit', () => {
  const options = [
    { group: 'Đơn vị', items: [{ value: 'dv1', label: 'DV1 — Đơn vị 1' }, { value: 'dv2', label: 'DV2 — Đơn vị 2' }] },
    { value: 'dv3', label: 'DV3 — Đơn vị 3' },
  ];

  const filtered = filterSelectOptions({ options, search: 'don vi', limit: 2 });

  assert.deepEqual(filtered, [{ group: 'Đơn vị', items: options[0].items }]);
});

test('normalizeSearchText handles punctuation and formatted phone numbers', () => {
  assert.equal(normalizeSearchText('Công ty A-B'), 'cong ty a b');
  assert.equal(normalizeSearchText('090-123 4567'), '0901234567');
});
