import { useMemo, useState } from 'react';
import type { AttendanceSummary } from '../../../features/attendance/attendanceTypes';
import type { SummaryScope } from './AttendanceSummaryCards';
import styles from './AttendanceSummaryChart.module.css';

type Tone = 'good' | 'warning' | 'critical' | 'unknown';

interface Segment {
  key: string;
  label: string;
  value: number;
  tone: Tone;
  hint: string;
}

interface AttendanceSummaryChartProps {
  summary: AttendanceSummary | undefined;
  /**
   * 'filter' when the counts cover every matching record; 'page' when only the
   * current page was tallied, which changes what the bar caption may claim.
   */
  scope?: SummaryScope;
}

function buildStatusSegments(summary: AttendanceSummary): Segment[] {
  return [
    {
      key: 'present',
      label: 'Đủ công',
      value: summary.present,
      tone: 'good',
      hint: 'Có đủ giờ vào và ra, vào ca không quá mốc đi muộn của ca.',
    },
    {
      key: 'unknown',
      label: 'Không rõ',
      value: summary.unknown,
      tone: 'unknown',
      hint: 'Chưa phân giải được ca hoặc giờ chấm không hợp lệ. Kiểm tra phân ca trước khi kết luận.',
    },
    {
      key: 'late',
      label: 'Đi muộn',
      value: summary.late,
      tone: 'warning',
      hint: 'Giờ vào trễ hơn giờ bắt đầu ca cộng dung sai cấu hình trong Ca làm việc.',
    },
    {
      key: 'singlePunch',
      label: 'Chấm 1 lần',
      value: summary.singlePunch,
      tone: 'warning',
      hint: 'Chỉ ghi nhận một lần chấm nên chưa xác định được giờ ra.',
    },
    {
      key: 'absent',
      label: 'Vắng',
      value: summary.absent,
      tone: 'critical',
      hint: 'Ngày làm việc theo ca nhưng không có lần chấm nào.',
    },
  ];
}

function buildMappingSegments(summary: AttendanceSummary): Segment[] {
  const conflict = summary.conflict ?? 0;
  return [
    {
      key: 'mapped',
      label: 'Đã map',
      value: summary.mapped + (summary.autoMapped ?? 0),
      tone: 'good',
      hint: 'Đã liên kết với nhân sự trong HRM.',
    },
    {
      key: 'unmapped',
      label: 'Chưa map',
      value: summary.unmapped,
      tone: 'warning',
      hint: 'Chưa liên kết nhân sự HRM nên không lên lịch cá nhân và bảng công.',
    },
    {
      key: 'conflict',
      label: 'Trùng mã',
      value: conflict,
      tone: 'critical',
      hint: 'Một mã chấm công khớp nhiều nhân sự.',
    },
  ];
}

/** Round the axis top up to a clean 1 / 2 / 5 x 10^n step. */
function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

const formatCount = (value: number) => value.toLocaleString('vi-VN');

interface ColumnChartProps {
  title: string;
  segments: Segment[];
  caption: string;
}

function ColumnChart({ title, segments, caption }: ColumnChartProps) {
  // Click pins a column; hover/focus previews one while nothing is pinned.
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const activeKey = pinnedKey ?? hoverKey;

  const counted = segments.reduce((sum, s) => sum + s.value, 0);
  const axisTop = useMemo(
    () => niceCeiling(Math.max(...segments.map((s) => s.value), 0)),
    [segments],
  );
  const share = (value: number) => (counted > 0 ? (value / counted) * 100 : 0);
  const active = segments.find((s) => s.key === activeKey) ?? null;

  if (counted === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.heading}>
          <span className={styles.title}>{title}</span>
          <span className={styles.total}>{caption}</span>
        </div>
        <p className={styles.empty}>Chưa có dữ liệu để dựng biểu đồ.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>
        <span className={styles.title}>{title}</span>
        <span className={styles.total}>{caption}</span>
      </div>

      <div className={styles.plotWrap}>
        <div className={styles.plot}>
          {/* No gridlines or y-axis: every column is already directly labelled,
              and the skill puts direct labels ahead of grid chrome. */}
          <div
            className={styles.columns}
            role="img"
            aria-label={`${title}: ${segments
              .map((s) => `${s.label} ${formatCount(s.value)}, ${share(s.value).toFixed(0)}%`)
              .join('; ')}`}
          >
            {segments.map((segment) => {
              const height = axisTop > 0 ? (segment.value / axisTop) * 100 : 0;
              return (
                <button
                  type="button"
                  key={segment.key}
                  className={styles.column}
                  data-active={segment.key === activeKey ? 'true' : undefined}
                  onPointerEnter={() => setHoverKey(segment.key)}
                  onPointerLeave={() => setHoverKey(null)}
                  onFocus={() => setHoverKey(segment.key)}
                  onBlur={() => setHoverKey(null)}
                  onClick={() =>
                    setPinnedKey((current) => (current === segment.key ? null : segment.key))
                  }
                  aria-pressed={segment.key === pinnedKey}
                  aria-label={`${segment.label}: ${formatCount(segment.value)} bản ghi, ${share(
                    segment.value,
                  ).toFixed(0)}%`}
                >
                  {/* Value rides the cap so the number never depends on hover. */}
                  <span className={styles.columnValue}>{formatCount(segment.value)}</span>
                  <span
                    className={styles.columnBar}
                    data-tone={segment.tone}
                    data-empty={segment.value === 0 ? 'true' : undefined}
                    style={{ height: `${height}%` }}
                  />
                  <span className={styles.columnLabel}>{segment.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel in a reserved row, so opening it never shifts the plot. */}
        <div className={styles.detailSlot}>
          {active ? (
            <div className={styles.detailCard} role="status">
              <span className={styles.detailMain}>
                <span className={styles.detailHead}>
                  <span className={styles.swatch} data-tone={active.tone} aria-hidden="true" />
                  {active.label}
                </span>
                <span className={styles.detailValue}>{formatCount(active.value)}</span>
              </span>
              <span className={styles.detailBody}>
                <span className={styles.detailShare}>
                  {share(active.value).toFixed(1)}% của {formatCount(counted)} bản ghi
                </span>
                <span className={styles.detailHint}>{active.hint}</span>
              </span>
            </div>
          ) : (
            <p className={styles.detailIdle}>
              Di chuột hoặc chọn một cột để xem chi tiết.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AttendanceSummaryChart({
  summary,
  scope = 'filter',
}: AttendanceSummaryChartProps) {
  if (!summary) {
    return null;
  }

  const statusSegments = buildStatusSegments(summary);
  const statusCounted = statusSegments.reduce((sum, s) => sum + s.value, 0);
  // Only claim full coverage when the counts really span the filter.
  const caption =
    scope === 'filter'
      ? `${formatCount(summary.total)} bản ghi`
      : `${formatCount(statusCounted)}/${formatCount(summary.total)} bản ghi (trang này)`;

  const mappingSegments = buildMappingSegments(summary).filter(
    // Conflict has no backend bucket yet; drop the slot instead of drawing a zero.
    (segment) => segment.key !== 'conflict' || segment.value > 0,
  );

  return (
    <div className={styles.root}>
      <ColumnChart
        title="Phân bổ trạng thái chấm công"
        segments={statusSegments}
        caption={caption}
      />
      <ColumnChart
        title="Tình trạng liên kết nhân sự"
        segments={mappingSegments}
        caption={caption}
      />
    </div>
  );
}
