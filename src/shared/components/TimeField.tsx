import { TextInput, type TextInputProps } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

type TimeFieldProps = Omit<TextInputProps, 'type' | 'onChange' | 'value'> & {
  value?: string;
  onChange?: (value: string) => void;
};

/**
 * Clock time entry backed by the native `time` input.
 *
 * The shift form previously used free-text fields, so a mistyped "8h" or "0800"
 * only surfaced as a validation error after saving. The native control shows a
 * picker, enforces HH:mm itself, and still stores the same string the API
 * expects.
 */
export function TimeField({ value, onChange, ...props }: TimeFieldProps) {
  return (
    <TextInput
      {...props}
      type="time"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.currentTarget.value)}
      leftSection={<IconClock size={15} aria-hidden />}
    />
  );
}
