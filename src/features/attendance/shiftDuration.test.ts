import { describe, expect, it } from 'vitest';
import { computeShiftWorkingMinutes, formatWorkingMinutes } from './shiftDuration';

describe('computeShiftWorkingMinutes', () => {
  it('trừ nghỉ trưa khỏi ca hành chính', () => {
    expect(
      computeShiftWorkingMinutes({
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00',
        breakDeducted: true,
      }),
    ).toBe(480);
  });

  it('giữ nguyên giờ làm khi nghỉ trưa được tính công', () => {
    expect(
      computeShiftWorkingMinutes({
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00',
        breakDeducted: false,
      }),
    ).toBe(540);
  });

  it('tính ca sáng thứ 7 không nghỉ giữa ca', () => {
    expect(
      computeShiftWorkingMinutes({ startTime: '08:00', endTime: '12:00' }),
    ).toBe(240);
  });

  it('chỉ trừ phần nghỉ nằm trong ca', () => {
    // Ca sáng kết thúc 12:00 nhưng nghỉ khai 11:30–13:00: chỉ 30 phút chồng lấn.
    expect(
      computeShiftWorkingMinutes({
        startTime: '08:00',
        endTime: '12:00',
        breakStart: '11:30',
        breakEnd: '13:00',
        breakDeducted: true,
      }),
    ).toBe(210);
  });

  it('không trừ gì khi giờ nghỉ nằm ngoài ca', () => {
    expect(
      computeShiftWorkingMinutes({
        startTime: '13:00',
        endTime: '17:00',
        breakStart: '11:30',
        breakEnd: '12:30',
        breakDeducted: true,
      }),
    ).toBe(240);
  });

  it('tính đúng ca qua ngày 22:00–06:00 = 8 tiếng', () => {
    expect(
      computeShiftWorkingMinutes({ startTime: '22:00', endTime: '06:00' }),
    ).toBe(480);
  });

  it('tính đúng ca đêm BV5 18:30–06:30 = 12 tiếng', () => {
    expect(
      computeShiftWorkingMinutes({ startTime: '18:30', endTime: '06:30' }),
    ).toBe(720);
  });

  it('ca qua ngày có nghỉ giữa ca sau nửa đêm được trừ đúng', () => {
    // 22:00→06:00 = 480', nghỉ 00:00–00:30 nằm trong ca → còn 450'.
    expect(
      computeShiftWorkingMinutes({
        startTime: '22:00',
        endTime: '06:00',
        breakStart: '00:00',
        breakEnd: '00:30',
        breakDeducted: true,
      }),
    ).toBe(450);
  });

  it('trả null khi giờ vào bằng giờ tan ca', () => {
    expect(
      computeShiftWorkingMinutes({ startTime: '08:00', endTime: '08:00' }),
    ).toBeNull();
  });

  it('trả null khi giờ chưa nhập đủ hoặc sai định dạng', () => {
    expect(computeShiftWorkingMinutes({ startTime: '', endTime: '17:00' })).toBeNull();
    expect(computeShiftWorkingMinutes({ startTime: '8h', endTime: '17:00' })).toBeNull();
    expect(computeShiftWorkingMinutes({ startTime: '08:00', endTime: '25:00' })).toBeNull();
  });

  it('bỏ qua giờ nghỉ khai ngược hoặc thiếu vế', () => {
    expect(
      computeShiftWorkingMinutes({
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '13:00',
        breakEnd: '12:00',
        breakDeducted: true,
      }),
    ).toBe(540);

    expect(
      computeShiftWorkingMinutes({
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakDeducted: true,
      }),
    ).toBe(540);
  });

  it('chấp nhận giờ một chữ số', () => {
    expect(
      computeShiftWorkingMinutes({ startTime: '7:30', endTime: '11:30' }),
    ).toBe(240);
  });

  it('trả null khi nghỉ nuốt trọn ca', () => {
    expect(
      computeShiftWorkingMinutes({
        startTime: '12:00',
        endTime: '13:00',
        breakStart: '11:00',
        breakEnd: '14:00',
        breakDeducted: true,
      }),
    ).toBeNull();
  });
});

describe('formatWorkingMinutes', () => {
  it('hiện số giờ tròn không kèm phút', () => {
    expect(formatWorkingMinutes(480)).toBe('8 giờ');
  });

  it('hiện cả giờ và phút khi lẻ', () => {
    expect(formatWorkingMinutes(450)).toBe('7 giờ 30 phút');
  });

  it('hiện riêng phút khi chưa đủ một giờ', () => {
    expect(formatWorkingMinutes(45)).toBe('45 phút');
  });
});
