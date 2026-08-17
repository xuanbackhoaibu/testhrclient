import { describe, expect, it } from 'vitest';
import { addMinutesToTime } from './shiftTime';

describe('addMinutesToTime', () => {
  it('adds minutes within the same hour', () => {
    expect(addMinutesToTime('08:00', 10)).toBe('08:10');
  });

  it('rolls over into the next hour', () => {
    expect(addMinutesToTime('07:55', 10)).toBe('08:05');
  });

  it('wraps past midnight', () => {
    expect(addMinutesToTime('23:50', 20)).toBe('00:10');
  });

  it('handles a zero threshold', () => {
    expect(addMinutesToTime('08:00', 0)).toBe('08:00');
  });

  it('handles negative minutes', () => {
    expect(addMinutesToTime('08:05', -10)).toBe('07:55');
  });

  it('wraps backwards past midnight', () => {
    expect(addMinutesToTime('00:05', -10)).toBe('23:55');
  });

  it('pads single-digit hours', () => {
    expect(addMinutesToTime('7:30', 10)).toBe('07:40');
  });

  it('returns the input unchanged when it is not a time', () => {
    expect(addMinutesToTime('', 10)).toBe('');
    expect(addMinutesToTime('abc', 10)).toBe('abc');
    expect(addMinutesToTime('25:00', 10)).toBe('25:00');
    expect(addMinutesToTime('08:75', 10)).toBe('08:75');
  });
});
