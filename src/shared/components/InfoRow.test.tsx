// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, describe, expect, it } from 'vitest';

import { InfoRow } from './InfoRow';

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


function renderRow(ui: React.ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

afterEach(cleanup);

describe('InfoRow', () => {
  it('hiện nhãn và giá trị', () => {
    renderRow(<InfoRow label="Họ tên">Nguyễn Văn A</InfoRow>);
    expect(screen.getByText('Họ tên')).toBeDefined();
    expect(screen.getByText('Nguyễn Văn A')).toBeDefined();
  });

  it('dashWhenEmpty hiện — khi giá trị rỗng', () => {
    renderRow(<InfoRow label="Email" dashWhenEmpty>{null}</InfoRow>);
    expect(screen.getByText('—')).toBeDefined();
  });

  it('không có dashWhenEmpty thì để trống, không tự chèn —', () => {
    renderRow(<InfoRow label="Email">{null}</InfoRow>);
    expect(screen.queryByText('—')).toBeNull();
  });
});
