import { useMemo, type ReactNode } from 'react';
import { Input, Select } from '@mantine/core';
import styles from './TimeField.module.css';

interface TimeFieldProps {
  label?: string;
  description?: string;
  /** Matches Mantine's form error type, which is a ReactNode, not a string. */
  error?: ReactNode;
  withAsterisk?: boolean;
  disabled?: boolean;
  /** "HH:mm", or empty when unset. */
  value?: string;
  onChange?: (value: string) => void;
  /** Minute step for the minute list; 5 keeps the list short. */
  minuteStep?: number;
}

const HOURS = Array.from({ length: 24 }, (_, index) => {
  const value = String(index).padStart(2, '0');
  return { value, label: value };
});

function buildMinutes(step: number) {
  const count = Math.max(1, Math.floor(60 / step));
  return Array.from({ length: count }, (_, index) => {
    const value = String(index * step).padStart(2, '0');
    return { value, label: value };
  });
}

function split(value: string | undefined): [string | null, string | null] {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim());
  if (!match) return [null, null];
  return [match[1].padStart(2, '0'), match[2]];
}

/**
 * Clock time entry as two dropdowns.
 *
 * The shift form used free-text fields, so a mistyped "8h" only surfaced as a
 * validation error after saving. The obvious replacement — `input[type=time]` —
 * renders AM/PM whenever the browser locale is en-*, and Chrome ignores `lang`
 * on that control, so an English Windows machine would show a 12-hour clock on
 * a Vietnamese timesheet. Two selects render identically everywhere and can
 * only produce a valid HH:mm.
 *
 * A minute outside the step (an imported 07:47) is kept as its own option so
 * editing a shift never silently rounds a stored value.
 */
export function TimeField({
  label,
  description,
  error,
  withAsterisk,
  disabled,
  value,
  onChange,
  minuteStep = 5,
}: TimeFieldProps) {
  const [hour, minute] = split(value);

  const minuteOptions = useMemo(() => {
    const options = buildMinutes(minuteStep);
    if (minute && !options.some((option) => option.value === minute)) {
      return [...options, { value: minute, label: minute }].sort((a, b) =>
        a.value.localeCompare(b.value),
      );
    }
    return options;
  }, [minuteStep, minute]);

  const emit = (nextHour: string | null, nextMinute: string | null) => {
    if (!nextHour && !nextMinute) {
      onChange?.('');
      return;
    }
    // Filling one half alone is treated as the other half being :00 / 00:.
    onChange?.(`${nextHour ?? '00'}:${nextMinute ?? '00'}`);
  };

  return (
    <Input.Wrapper
      label={label}
      description={description}
      error={error}
      withAsterisk={withAsterisk}
    >
      <div className={styles.timeRow}>
        <Select
          data={HOURS}
          value={hour}
          onChange={(next) => emit(next, minute)}
          placeholder="Giờ"
          aria-label={label ? `${label} — giờ` : 'Giờ'}
          disabled={disabled}
          searchable
          allowDeselect={false}
          maxDropdownHeight={220}
          className={styles.part}
          error={Boolean(error)}
        />
        <span className={styles.colon} aria-hidden="true">
          :
        </span>
        <Select
          data={minuteOptions}
          value={minute}
          onChange={(next) => emit(hour, next)}
          placeholder="Phút"
          aria-label={label ? `${label} — phút` : 'Phút'}
          disabled={disabled}
          searchable
          allowDeselect={false}
          maxDropdownHeight={220}
          className={styles.part}
          error={Boolean(error)}
        />
      </div>
    </Input.Wrapper>
  );
}
