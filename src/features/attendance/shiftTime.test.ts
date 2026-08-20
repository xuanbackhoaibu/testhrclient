import { describe, expect, it } from 'vitest';
import {
  addMinutesToTime,
  isOvernightShiftTime,
  shiftSpanDays,
} from './shiftTime';

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

describe('isOvernightShiftTime', () => {
  it('nhận diện ca đêm kết thúc sáng hôm sau', () => {
    // BV5 18:30–06:30, VH2 19:30–07:30, BV2 18:10–06:00
    expect(isOvernightShiftTime('18:30', '06:30')).toBe(true);
    expect(isOvernightShiftTime('19:30', '07:30')).toBe(true);
    expect(isOvernightShiftTime('18:10', '06:00')).toBe(true);
  });

  it('nhận diện ca 24 giờ có giờ vào bằng giờ ra', () => {
    // VH3 07:30–07:30, BV6 06:30–06:30
    expect(isOvernightShiftTime('07:30', '07:30')).toBe(true);
    expect(isOvernightShiftTime('06:30', '06:30')).toBe(true);
    // BV3 06:10–06:00 kết thúc sớm hơn giờ vào 10 phút.
    expect(isOvernightShiftTime('06:10', '06:00')).toBe(true);
  });

  it('ca ngày thường không phải ca qua ngày', () => {
    expect(isOvernightShiftTime('08:00', '17:00')).toBe(false);
    expect(isOvernightShiftTime('08:00', '12:00')).toBe(false);
    expect(isOvernightShiftTime('07:30', '19:30')).toBe(false);
  });

  it('thiếu dữ liệu giờ thì không đoán bừa', () => {
    expect(isOvernightShiftTime(undefined, undefined)).toBe(false);
    expect(isOvernightShiftTime('18:30', undefined)).toBe(false);
    expect(isOvernightShiftTime('', '06:30')).toBe(false);
  });
});

describe('shiftSpanDays', () => {
  it('ca 12 giờ và ca 24 giờ đều trải 1 ngày', () => {
    expect(shiftSpanDays(720)).toBe(1);
    expect(shiftSpanDays(1440)).toBe(1);
  });

  it('ca dài hơn 24 giờ trải nhiều ngày', () => {
    expect(shiftSpanDays(1441)).toBe(2);
    expect(shiftSpanDays(2880)).toBe(2);
  });

  it('thiếu số phút chuẩn thì mặc định 1 ngày', () => {
    expect(shiftSpanDays(undefined)).toBe(1);
    expect(shiftSpanDays(0)).toBe(1);
  });
});
