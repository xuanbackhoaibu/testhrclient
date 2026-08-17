import { IconCalendar } from '@tabler/icons-react';
import { HrmDateInput } from '../../../shared/components/HrmDateInput';
import styles from './AttendanceNativeDateInput.module.css';

type AttendanceNativeDateInputProps = {
  value?: string;
  onChange: (value?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  ariaLabel?: string;
};

export function AttendanceNativeDateInput({
  value,
  onChange,
  disabled,
  placeholder,
  min,
  max,
  className,
  ariaLabel,
}: AttendanceNativeDateInputProps) {
  return (
    <HrmDateInput
      value={value || null}
      onChange={(nextValue) => onChange(nextValue ?? undefined)}
      disabled={disabled}
      minDate={min}
      maxDate={max}
      placeholder={placeholder || 'dd/mm/yyyy'}
      aria-label={ariaLabel || 'Chọn ngày'}
      classNames={{
        root: `${styles.root} ${className || ''}`,
        input: styles.input,
      }}
      rightSection={<IconCalendar size={16} aria-hidden />}
    />
  );
}
