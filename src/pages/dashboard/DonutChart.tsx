import { useState } from 'react';
import styles from './DashboardCharts.module.css';
import { formatNumber as formatCount } from '../../shared/utils/format';

export type ChartTone = 'good' | 'warning' | 'critical' | 'unknown' | 'accent';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  tone: ChartTone;
}

interface DonutChartProps {
  slices: DonutSlice[];
  /** Sits inside the ring: the total the slices add up to. */
  centerLabel: string;
}

const SIZE = 180;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface gap between slices, expressed along the arc. */
const GAP = 3;


/**
 * Part-to-whole at a glance. Capped at a handful of slices by the caller —
 * past ~6 the arcs stop being comparable and a bar chart is the right form.
 */
export function DonutChart({ slices, centerLabel }: DonutChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const visible = slices.filter((slice) => slice.value > 0);
  const active = slices.find((slice) => slice.key === activeKey) ?? null;

  if (total === 0) {
    return <p className={styles.empty}>Chưa có dữ liệu để dựng biểu đồ.</p>;
  }

  // Each slice starts where the previous ones ended, summed without mutation.
  const arcs = visible.map((slice, index) => {
    const arc = (slice.value / total) * CIRCUMFERENCE;
    const start = visible
      .slice(0, index)
      .reduce((sum, prev) => sum + (prev.value / total) * CIRCUMFERENCE, 0);
    return { slice, arc, start };
  });

  return (
    <div className={styles.donutWrap}>
      <div className={styles.donutFigure}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Tỷ trọng: ${visible
            .map(
              (slice) =>
                `${slice.label} ${formatCount(slice.value)}, ${((slice.value / total) * 100).toFixed(0)}%`,
            )
            .join('; ')}`}
        >
          {/* Rotate so the first slice starts at 12 o'clock. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {arcs.map(({ slice, arc, start }) => {
              // Leave the gap out of the drawn arc, never off the last pixel.
              const drawn = Math.max(arc - GAP, 1);
              const dash = `${drawn} ${CIRCUMFERENCE - drawn}`;
              // Half the removed gap at each end keeps the arc centred in its
              // span, so the round caps do not drift the slice off its share.
              const rotation = -(start + (arc - drawn) / 2);

              return (
                <circle
                  key={slice.key}
                  className={styles.donutSlice}
                  data-tone={slice.tone}
                  data-dim={activeKey && activeKey !== slice.key ? 'true' : undefined}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  strokeWidth={STROKE}
                  strokeDasharray={dash}
                  strokeDashoffset={rotation}
                  onPointerEnter={() => setActiveKey(slice.key)}
                  onPointerLeave={() => setActiveKey(null)}
                />
              );
            })}
          </g>
        </svg>

        {/* Center readout: the hovered slice, or the total when idle. */}
        <div className={styles.donutCenter} aria-hidden="true">
          <span className={styles.donutCenterValue}>
            {formatCount(active ? active.value : total)}
          </span>
          <span className={styles.donutCenterLabel}>
            {active ? active.label : centerLabel}
          </span>
        </div>
      </div>

      {/* Legend carries identity, so nothing depends on colour alone. */}
      <ul className={styles.legend}>
        {slices.map((slice) => (
          <li
            key={slice.key}
            className={styles.legendItem}
            onPointerEnter={() => setActiveKey(slice.key)}
            onPointerLeave={() => setActiveKey(null)}
          >
            <span className={styles.swatch} data-tone={slice.tone} aria-hidden="true" />
            <span className={styles.legendLabel}>{slice.label}</span>
            <span className={styles.legendValue}>{formatCount(slice.value)}</span>
            <span className={styles.legendShare}>
              {total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0,0'}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
