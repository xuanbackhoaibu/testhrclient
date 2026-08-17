import { Tooltip } from '@mantine/core';
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

interface StackedBarProps {
  title: string;
  segments: Segment[];
  caption: string;
}

function StackedBar({ title, segments, caption }: StackedBarProps) {
  const counted = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const share = (value: number) => (counted > 0 ? (value / counted) * 100 : 0);

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>
        <span className={styles.title}>{title}</span>
        <span className={styles.total}>{caption}</span>
      </div>

      {counted === 0 ? (
        <p className={styles.empty}>Chưa có dữ liệu để dựng biểu đồ.</p>
      ) : (
        <>
          <div
            className={styles.bar}
            role="img"
            aria-label={`${title}: ${visible
              .map((s) => `${s.label} ${s.value}, ${share(s.value).toFixed(0)}%`)
              .join('; ')}`}
          >
            {visible.map((segment) => {
              const pct = share(segment.value);
              return (
                <Tooltip
                  key={segment.key}
                  label={`${segment.label}: ${segment.value.toLocaleString('vi-VN')} (${pct.toFixed(1)}%) — ${segment.hint}`}
                  withArrow
                  multiline
                  w={280}
                  openDelay={120}
                >
                  <div
                    className={styles.segment}
                    data-tone={segment.tone}
                    style={{ width: `${pct}%` }}
                  >
                    {/* Direct-label only where the text actually fits. */}
                    {pct >= 12 && (
                      <span className={styles.segmentLabel}>{pct.toFixed(0)}%</span>
                    )}
                  </div>
                </Tooltip>
              );
            })}
          </div>

          <div className={styles.legend}>
            {segments.map((segment) => (
              <span
                key={segment.key}
                className={styles.legendItem}
                data-zero={segment.value === 0 ? 'true' : undefined}
              >
                <span className={styles.swatch} data-tone={segment.tone} aria-hidden="true" />
                {segment.label}
                <span className={styles.legendValue}>
                  {segment.value.toLocaleString('vi-VN')}
                </span>
                {segment.value > 0 && (
                  <span className={styles.legendShare}>{share(segment.value).toFixed(0)}%</span>
                )}
              </span>
            ))}
          </div>
        </>
      )}
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
      ? `${summary.total.toLocaleString('vi-VN')} bản ghi`
      : `${statusCounted.toLocaleString('vi-VN')}/${summary.total.toLocaleString('vi-VN')} bản ghi (trang này)`;

  const mappingSegments = buildMappingSegments(summary).filter(
    // Conflict has no backend bucket yet; drop the slot instead of drawing a zero.
    (segment) => segment.key !== 'conflict' || segment.value > 0,
  );

  return (
    <div className={styles.root}>
      <StackedBar
        title="Phân bổ trạng thái chấm công"
        segments={statusSegments}
        caption={caption}
      />
      <StackedBar
        title="Tình trạng liên kết nhân sự"
        segments={mappingSegments}
        caption={caption}
      />
    </div>
  );
}
