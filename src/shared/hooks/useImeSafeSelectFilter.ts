import { useCallback, useMemo, useState } from 'react';
import type { SelectProps } from '@mantine/core';
import { filterSelectOptions } from '../utils/filterSelectOptions.ts';

type SelectFilter = NonNullable<SelectProps['filter']>;

/**
 * Keeps Mantine searchable Select/MultiSelect inputs display-controlled by
 * Mantine while preventing comparison normalization against an intermediate
 * IME composition value. Filtering resumes with the finalized input on
 * composition end.
 */
export function useImeSafeSelectFilter() {
  const [isComposing, setIsComposing] = useState(false);

  const filter = useCallback<SelectFilter>(
    (input) => (isComposing ? input.options.slice(0, input.limit) : filterSelectOptions(input)),
    [isComposing],
  );

  const onCompositionStart = useCallback(() => setIsComposing(true), []);
  const onCompositionEnd = useCallback(() => setIsComposing(false), []);

  return useMemo(
    () => ({ filter, onCompositionStart, onCompositionEnd }),
    [filter, onCompositionEnd, onCompositionStart],
  );
}
