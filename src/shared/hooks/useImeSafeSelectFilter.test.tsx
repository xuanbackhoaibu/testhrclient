// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useImeSafeSelectFilter } from './useImeSafeSelectFilter.ts';

function SelectFilterHarness() {
  const selectSearch = useImeSafeSelectFilter();
  const { filter, ...compositionEvents } = selectSearch;
  const options = [
    { value: 'dv001', label: 'DV001 — Đơn vị Công nghệ' },
    { value: 'hc001', label: 'HC001 — Hành chính' },
  ];
  const visibleLabels = filter({ options, search: 'cong nghe', limit: Infinity })
    .map((option) => ('label' in option ? option.label : ''))
    .join('|');

  return (
    <>
      <input aria-label="select-search" {...compositionEvents} />
      <output>{visibleLabels}</output>
    </>
  );
}

describe('useImeSafeSelectFilter', () => {
  it('does not normalize/filter an intermediate IME composition value', () => {
    render(<SelectFilterHarness />);
    const input = screen.getByLabelText('select-search');

    expect(screen.getByRole('status').textContent).toContain('DV001 — Đơn vị Công nghệ');

    fireEvent.compositionStart(input);
    expect(screen.getByRole('status').textContent).toContain('HC001 — Hành chính');

    fireEvent.compositionEnd(input);
    expect(screen.getByRole('status').textContent).not.toContain('HC001 — Hành chính');
  });
});
