import { AttendanceNativeDateInput } from './AttendanceNativeDateInput';
import type { AttendanceDateMode, AttendanceDateFilterValue } from './AttendanceDateFilter.types';
import styles from './AttendanceDateFilter.module.css';

interface AttendanceDateFilterProps {
  value: AttendanceDateFilterValue;
  onChange: (value: AttendanceDateFilterValue) => void;
}

export function AttendanceDateFilter({ value, onChange }: AttendanceDateFilterProps) {
  const setMode = (mode: AttendanceDateMode) => {
    if (mode === 'date') {
      onChange({
        mode: 'date',
        date: value.date || value.to || value.from || '',
        from: undefined,
        to: undefined,
      });
      return;
    }

    onChange({
      mode: 'range',
      date: undefined,
      from: value.from || value.date || '',
      to: value.to || value.date || '',
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className={styles.root}>
      <div className={styles.modeToggle} role="tablist" aria-label="Kiểu lọc ngày">
        <button
          type="button"
          className={value.mode === 'date' ? styles.active : ''}
          onClick={() => setMode('date')}
        >
          Ngày
        </button>
        <button
          type="button"
          className={value.mode === 'range' ? styles.active : ''}
          onClick={() => setMode('range')}
        >
          Khoảng
        </button>
      </div>

      {value.mode === 'date' ? (
        <AttendanceNativeDateInput
          value={value.date}
          onChange={(date) =>
            onChange({
              mode: 'date',
              date,
              from: undefined,
              to: undefined,
            })
          }
          ariaLabel="Chọn ngày chấm công"
        />
      ) : (
        <div className={styles.rangeInputs}>
          <AttendanceNativeDateInput
            value={value.from}
            onChange={(from) =>
              onChange({
                ...value,
                mode: 'range',
                date: undefined,
                from,
              })
            }
            max={value.to}
            ariaLabel="Từ ngày"
          />
          <span className={styles.rangeSeparator}>—</span>
          <AttendanceNativeDateInput
            value={value.to}
            onChange={(to) =>
              onChange({
                ...value,
                mode: 'range',
                date: undefined,
                to,
              })
            }
            min={value.from}
            max={today}
            ariaLabel="Đến ngày"
          />
        </div>
      )}
    </div>
  );
}
