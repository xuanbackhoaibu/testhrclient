import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CompositionEvent } from 'react';

interface UseImeSafeSearchOptions {
  value?: string;
  defaultValue?: string;
  debounceMs?: number;
  onSearch: (value: string) => void;
}

/**
 * Keeps browser IME composition separate from the debounced search query.
 * The raw value is never normalized or written back while the user is typing.
 */
export function useImeSafeSearch({
  value,
  defaultValue = '',
  debounceMs = 300,
  onSearch,
}: UseImeSafeSearchOptions) {
  const [inputValue, setInputValue] = useState(value ?? defaultValue);
  const [isComposing, setIsComposing] = useState(false);
  const composingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);
  const externalValueRef = useRef(value);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    // A controlled value represents an external navigation/reset only when it
    // actually changes. Do not copy the previous committed value back into the
    // input while the user is typing ahead of the debounce timer.
    if (value === externalValueRef.current) return;
    externalValueRef.current = value;
    if (!composingRef.current && value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  const cancelPendingSearch = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const publish = useCallback((nextValue: string, immediately = false) => {
    cancelPendingSearch();
    if (immediately || debounceMs <= 0) {
      onSearchRef.current(nextValue);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onSearchRef.current(nextValue);
    }, debounceMs);
  }, [cancelPendingSearch, debounceMs]);

  useEffect(() => cancelPendingSearch, [cancelPendingSearch]);

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value;
    setInputValue(nextValue);
    if (!composingRef.current) publish(nextValue);
  }, [publish]);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
    setIsComposing(true);
    cancelPendingSearch();
  }, [cancelPendingSearch]);

  const onCompositionEnd = useCallback((event: CompositionEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value;
    composingRef.current = false;
    setIsComposing(false);
    setInputValue(nextValue);
    publish(nextValue);
  }, [publish]);

  const clear = useCallback((publishChange = true) => {
    composingRef.current = false;
    setIsComposing(false);
    setInputValue('');
    if (publishChange) publish('', true);
  }, [publish]);

  return {
    inputValue,
    isComposing,
    inputProps: { value: inputValue, onChange, onCompositionStart, onCompositionEnd },
    clear,
  };
}
