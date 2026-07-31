import type { SelectProps } from '@mantine/core';
import { includesNormalizedSearch } from './normalizeSearchText.ts';

type SelectFilterInput = Parameters<NonNullable<SelectProps['filter']>>[0];

/**
 * Accent-insensitive local filtering for Mantine Select data.
 *
 * It compares only a normalized copy of option labels, never mutates the raw
 * label or the Select's own search input. Grouped options retain their group
 * and empty groups are omitted.
 */
export function filterSelectOptions({ options, search, limit }: SelectFilterInput) {
  const filtered = options.reduce<SelectFilterInput['options']>((result, option) => {
    if ('group' in option) {
      const items = option.items.filter((item) => includesNormalizedSearch(item.label, search));
      if (items.length > 0) result.push({ ...option, items });
      return result;
    }

    if (includesNormalizedSearch(option.label, search)) result.push(option);
    return result;
  }, []);

  if (!limit || limit < 0) return filtered;

  let remaining = limit;
  return filtered.reduce<SelectFilterInput['options']>((result, option) => {
    if (remaining <= 0) return result;
    if ('group' in option) {
      const items = option.items.slice(0, remaining);
      remaining -= items.length;
      if (items.length > 0) result.push({ ...option, items });
      return result;
    }

    remaining -= 1;
    result.push(option);
    return result;
  }, []);
}
