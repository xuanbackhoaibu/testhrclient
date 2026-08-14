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

  it("accepts a natural dd/mm/yyyy entry without opening the calendar on focus", () => {
    const onChange = vi.fn();
    render(
      <MantineProvider>
        <HrmDateInput
          aria-label="Ngày nhập tay"
          value={null}
          onChange={onChange}
        />
      </MantineProvider>,
    );

    const input = screen.getByLabelText("Ngày nhập tay") as HTMLInputElement;
    fireEvent.focus(input);

    expect(screen.queryByTestId("hrm-date-calendar")).toBeNull();

    fireEvent.change(input, { target: { value: "1/1/2024" } });
    expect(onChange).toHaveBeenLastCalledWith("2024-01-01");

    fireEvent.blur(input);
    expect(input.value).toBe("01/01/2024");
  });

  it("preserves an invalid typed date and explains how to correct it", () => {
    const onChange = vi.fn();
    render(
      <MantineProvider>
        <HrmDateInput
          aria-label="Ngày không hợp lệ"
          value={null}
          onChange={onChange}
        />
      </MantineProvider>,
    );

    const input = screen.getByLabelText(
      "Ngày không hợp lệ",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "31/02/2026" } });
    fireEvent.blur(input);

    expect(input.value).toBe("31/02/2026");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Nhập ngày theo dạng dd/mm/yyyy.")).toBeTruthy();
  });

  it("opens the date picker only from its explicit calendar button", () => {
    render(
      <MantineProvider>
        <HrmDateInput
          aria-label="Ngày mở lịch"
          value={null}
          onChange={vi.fn()}
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mở lịch" }));

    expect(
      (screen.getByLabelText("Ngày mở lịch") as HTMLInputElement).getAttribute(
        "aria-expanded",
      ),
    ).toBe("true");
  });
});
