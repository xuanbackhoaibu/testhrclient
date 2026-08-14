import assert from 'node:assert/strict';
import { test } from 'vitest';

import { includesNormalizedSearch, normalizeSearchText } from '../../shared/utils/normalizeSearchText.ts';

test('normalizes Vietnamese text, spacing, and letter d with stroke', () => {
  const expected = 'van phong tct';

  for (const value of ['Văn phòng TCT', 'văn phòng tct', 'VAN PHONG TCT', '  van   phong   tct ']) {
    assert.equal(normalizeSearchText(value), expected);
  }

  assert.equal(normalizeSearchText('Đậu Cao Minh Nhật'), 'dau cao minh nhat');
});

test('matches normalized display values without changing identifiers', () => {
  assert.equal(includesNormalizedSearch('Đậu Cao Minh Nhật', 'dau cao minh nhat'), true);
  assert.equal(includesNormalizedSearch('Văn phòng TCT', 'kế toán'), false);
});
