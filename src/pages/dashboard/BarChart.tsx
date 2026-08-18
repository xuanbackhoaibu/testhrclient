import type { ChartTone } from './DonutChart';
import styles from './DashboardCharts.module.css';
import { formatNumber as formatCount } from '../../shared/utils/format';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  tone?: ChartTone;
}

interface BarChartProps {
  items: BarDatum[];
  /** Rows past this fold into a single "Khác" row rather than scrolling. */
  maxRows?: number;
  unitSuffix?: string;
}


/**
 * Horizontal bars: the right form when category names are long (Vietnamese unit
 * names wrap badly under vertical columns) and the reader is ranking magnitudes.
 */
export function BarChart({ items, maxRows = 8, unitSuffix = 'nhân sự' }: BarChartProps) {
  const sorted = [...items].sort((a, b) => b.value - a.value);

  // Fold the tail into "Khác" instead of generating more rows or more hues.
  const head = sorted.slice(0, maxRows);
  const tail = sorted.slice(maxRows);
  const rows =
    tail.length > 0
      ? [
          ...head,
          {
            key: '__other__',
            label: `Khác (${tail.length} đơn vị)`,
            value: tail.reduce((sum, item) => sum + item.value, 0),
            tone: 'unknown' as ChartTone,
          },
        ]
      : head;

  const max = Math.max(...rows.map((row) => row.value), 0);

  if (rows.length === 0 || max === 0) {
    return <p className={styles.empty}>Chưa có dữ liệu để dựng biểu đồ.</p>;
  }

  return (
    <ul className={styles.barList}>
      {rows.map((row) => (
        <li key={row.key} className={styles.barRow}>
          <span className={styles.barLabel} title={row.label}>
            {row.label}
          </span>
          <span className={styles.barValue}>{formatCount(row.value)}</span>
          <span className={styles.barTrack}>
            <span
              className={styles.barFill}
              data-tone={row.tone ?? 'accent'}
              style={{ width: `${(row.value / max) * 100}%` }}
              role="img"
              aria-label={`${row.label}: ${formatCount(row.value)} ${unitSuffix}`}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
