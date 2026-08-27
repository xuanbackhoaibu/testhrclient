import { ActionIcon, TextInput, type TextInputProps } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useImeSafeSearch } from '../hooks/useImeSafeSearch';

interface NormalizedSearchInputProps extends Omit<TextInputProps, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Shared presentation for table search. Normalization remains server-side when
 * the API supports it; local callers use normalizeSearchText explicitly.
 */
export function NormalizedSearchInput({ value, onChange, ...props }: NormalizedSearchInputProps) {
  const { inputProps, inputValue, clear } = useImeSafeSearch({ value, onSearch: onChange });
  const accessibleName =
    props['aria-label'] ??
    (typeof props.label === 'string' ? props.label : undefined) ??
    (typeof props.placeholder === 'string' ? props.placeholder : 'Tìm kiếm');

  return (
    <TextInput
      {...props}
      {...inputProps}
      type={props.type ?? 'search'}
      aria-label={accessibleName}
      leftSection={<IconSearch size={16} aria-hidden />}
      rightSection={inputValue ? (
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label="Xóa từ khóa tìm kiếm"
          onClick={() => clear()}
        >
          <IconX size={15} aria-hidden />
        </ActionIcon>
      ) : undefined}
    />
  );
}
