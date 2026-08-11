// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useImeSafeSearch } from './useImeSafeSearch';

function SearchHarness({ onSearch }: { onSearch: (value: string) => void }) {
  const search = useImeSafeSearch({ onSearch, debounceMs: 300 });
  return (
    <>
      <input aria-label="search" {...search.inputProps} />
      <button type="button" onClick={() => search.clear()}>clear</button>
    </>
  );
}

function ControlledSearchHarness({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState('');
  const search = useImeSafeSearch({
    value,
    onSearch: (nextValue) => {
      setValue(nextValue);
      onSearch(nextValue);
    },
    debounceMs: 300,
  });
  return <input aria-label="controlled-search" {...search.inputProps} />;
}

describe('useImeSafeSearch', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each(['Nguyễn Thế Huy Hoàng', 'Đơn vị', 'Công nghệ', 'Phòng Kế toán'])(
    'keeps "%s" out of search until composition ends and debounces the committed value',
    (finalValue) => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchHarness onSearch={onSearch} />);
    const input = screen.getByLabelText('search');

    input.focus();
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: finalValue.slice(0, -1) } });
    expect((input as HTMLInputElement).value).toBe(finalValue.slice(0, -1));
    vi.advanceTimersByTime(300);
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input, { data: finalValue.at(-1), target: { value: finalValue } });
    expect((input as HTMLInputElement).value).toBe(finalValue);
    expect(onSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenLastCalledWith(finalValue);
    expect(document.activeElement).toBe(input);
    },
  );

  it('cancels stale debounces when typing quickly, clearing, and unmounting', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    const view = render(<SearchHarness onSearch={onSearch} />);
    const input = screen.getByLabelText('search');

    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('abc');

    fireEvent.change(input, { target: { value: 'abcd' } });
    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(onSearch).toHaveBeenLastCalledWith('');
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenCalledTimes(2);

    fireEvent.change(input, { target: { value: 'abcde' } });
    view.unmount();
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenCalledTimes(2);
  });

  it('does not overwrite a controlled raw value with the previous committed query', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<ControlledSearchHarness onSearch={onSearch} />);
    const input = screen.getByLabelText('controlled-search') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Nguyễn' } });
    expect(input.value).toBe('Nguyễn');
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('Nguyễn');
    expect(input.value).toBe('Nguyễn');
  });
});
