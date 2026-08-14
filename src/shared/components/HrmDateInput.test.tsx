// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HrmDateInput } from './HrmDateInput';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

describe('HrmDateInput', () => {
  afterEach(() => {
    cleanup();
  });

  it('displays ISO values as dd/mm/yyyy and returns ISO after typed input', () => {
    const onChange = vi.fn();
    render(
      <MantineProvider>
        <HrmDateInput
        aria-label="Ngày"
        value="2026-08-13"
        onChange={onChange}
        />
      </MantineProvider>,
    );

    const input = screen.getByLabelText('Ngày') as HTMLInputElement;
    expect(input.value).toBe('13/08/2026');

    fireEvent.change(input, { target: { value: '14/08/2026' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-08-14');
  });

  it('keeps clearing behavior while returning a null date value', () => {
    const onChange = vi.fn();
    render(
      <MantineProvider>
        <HrmDateInput
        aria-label="Ngày xóa"
        value="2026-08-13"
        onChange={onChange}
        />
      </MantineProvider>,
    );

    const input = screen.getByLabelText('Ngày xóa') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });

    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
