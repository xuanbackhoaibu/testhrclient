// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TimeField } from './TimeField';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: '',
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
});

// jsdom has no layout, so Mantine's scroll-to-active-option throws without this.
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  writable: true,
  value: () => undefined,
});

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

function renderField(props: Parameters<typeof TimeField>[0]) {
  return render(
    <MantineProvider>
      <TimeField {...props} />
    </MantineProvider>,
  );
}

/** Mantine puts the aria-label on both the input and its wrapper. */
function field(name: string): HTMLInputElement {
  return screen.getByRole('combobox', { name }) as HTMLInputElement;
}

afterEach(cleanup);

describe('TimeField', () => {
  it('tách HH:mm thành hai ô giờ và phút', () => {
    renderField({ label: 'Giờ vào ca', value: '08:30' });

    expect(field('Giờ vào ca — giờ')).toHaveProperty('value', '08');
    expect(field('Giờ vào ca — phút')).toHaveProperty('value', '30');
  });

  it('luôn dùng đồng hồ 24 giờ, không AM/PM', () => {
    renderField({ label: 'Giờ tan ca', value: '17:00' });

    expect(field('Giờ tan ca — giờ')).toHaveProperty('value', '17');
    expect(screen.queryByText(/AM|PM/)).toBeNull();
  });

  it('để trống cả hai ô khi chưa có giá trị', () => {
    renderField({ label: 'Bắt đầu nghỉ', value: '' });

    expect(field('Bắt đầu nghỉ — giờ')).toHaveProperty('value', '');
    expect(field('Bắt đầu nghỉ — phút')).toHaveProperty('value', '');
  });

  it('giữ nguyên phút lẻ ngoài bước nhảy thay vì làm tròn', async () => {
    // A shift imported as 07:47 must survive being opened for editing.
    renderField({ label: 'Giờ vào ca', value: '07:47', minuteStep: 5 });

    expect(field('Giờ vào ca — phút')).toHaveProperty('value', '47');
  });

  it('ghép lại thành HH:mm khi đổi giờ', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderField({ label: 'Giờ vào ca', value: '08:30', onChange });

    // Mantine's dropdown does not lay out under jsdom, so drive the select the
    // way the keyboard does instead of clicking a rendered option.
    const hour = field('Giờ vào ca — giờ');
    await user.click(hour);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalled();
    const [emitted] = onChange.mock.calls.at(-1) as [string];
    expect(emitted).toMatch(/^\d{2}:30$/);
  });

  it('coi nửa còn trống là 00 khi mới chọn một vế', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderField({ label: 'Bắt đầu nghỉ', value: '', onChange });

    const hour = field('Bắt đầu nghỉ — giờ');
    await user.click(hour);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalled();
    const [emitted] = onChange.mock.calls.at(-1) as [string];
    expect(emitted).toMatch(/^\d{2}:00$/);
  });

  it('bỏ qua giá trị sai định dạng thay vì hiển thị rác', () => {
    renderField({ label: 'Giờ vào ca', value: '8h sáng' });

    expect(field('Giờ vào ca — giờ')).toHaveProperty('value', '');
  });
});
