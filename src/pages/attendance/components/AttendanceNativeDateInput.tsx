import type { ChangeEvent } from 'react';
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
  min,
  max,
  className,
  ariaLabel,
}: AttendanceNativeDateInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value || undefined);
  };

  return (
    <input
      type="date"
      value={value || ''}
      onChange={handleChange}
      disabled={disabled}
      min={min}
      max={max}
      aria-label={ariaLabel || 'Chọn ngày'}
      className={`${styles.input} ${className || ''}`}
    />
  );
}
