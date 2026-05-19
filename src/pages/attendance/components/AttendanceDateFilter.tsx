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

  return (
    <div className={styles.root}>
      <div className={styles.modeToggle}>
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
        <input
          type="date"
          className={styles.nativeInput}
          value={value.date || ''}
          max={new Date().toISOString().split('T')[0]}
          onChange={(event) =>
            onChange({
              mode: 'date',
              date: event.target.value || undefined,
              from: undefined,
              to: undefined,
            })
          }
        />
      ) : (
        <div className={styles.rangeInputs}>
          <input
            type="date"
            className={styles.nativeInput}
            value={value.from || ''}
            max={value.to || undefined}
            onChange={(event) =>
              onChange({
                ...value,
                mode: 'range',
                from: event.target.value || undefined,
                date: undefined,
              })
            }
          />
          <span className={styles.rangeSeparator}>—</span>
          <input
            type="date"
            className={styles.nativeInput}
            value={value.to || ''}
            min={value.from || undefined}
            max={new Date().toISOString().split('T')[0]}
            onChange={(event) =>
              onChange({
                ...value,
                mode: 'range',
                to: event.target.value || undefined,
                date: undefined,
              })
            }
          />
        </div>
      )}
    </div>
  );
}
