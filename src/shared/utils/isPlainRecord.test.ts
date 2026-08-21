import { describe, expect, it } from 'vitest';

import { isPlainRecord } from './isPlainRecord';

describe('isPlainRecord', () => {
  it('nhận object thường', () => {
    expect(isPlainRecord({ a: 1 })).toBe(true);
    expect(isPlainRecord({})).toBe(true);
  });

  it('loại null và mảng', () => {
    expect(isPlainRecord(null)).toBe(false);
    expect(isPlainRecord([1, 2])).toBe(false);
    expect(isPlainRecord([])).toBe(false);
  });

  it('loại giá trị nguyên thuỷ', () => {
    expect(isPlainRecord('x')).toBe(false);
    expect(isPlainRecord(0)).toBe(false);
    expect(isPlainRecord(undefined)).toBe(false);
  });
});
