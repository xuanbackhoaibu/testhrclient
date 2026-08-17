import { Button, Skeleton, Tooltip } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import type { AttendanceSummary } from '../../../features/attendance/attendanceTypes';
import styles from './AttendanceSummaryCards.module.css';

/** Whether the figures cover the whole filter or only the page on screen. */
export type SummaryScope = 'filter' | 'page';

interface AttendanceSummaryCardsProps {
  summary: AttendanceSummary | undefined;
  scope?: SummaryScope;
  /** Opens the mapping screen; the CTA is hidden when omitted. */
  onOpenMapping?: () => void;
  chartOpened?: boolean;
  onToggleChart?: () => void;
}

type Tone = 'default' | 'positive' | 'warning' | 'danger' | 'muted';

interface StatProps {
  label: string;
  value: number;
  /** Percentage of total, rendered beside the value when provided. */
  share?: number;
  tone?: Tone;
  hint?: string;
  groupStart?: boolean;
}

function Stat({ label, value, share, tone = 'default', hint, groupStart }: StatProps) {
  const body = (
    <div className={groupStart ? `${styles.stat} ${styles.groupStart}` : styles.stat}>
      <span className={styles.label}>{label}</span>
      <span className={styles.figure}>
        <span className={styles.value} data-tone={tone === 'default' ? undefined : tone}>
          {value.toLocaleString('vi-VN')}
        </span>
        {share !== undefined && value > 0 && (
          <span className={styles.share}>{share.toFixed(0)}%</span>
        )}
      </span>
      {share !== undefined && (
        <span className={styles.track} aria-hidden="true">
          <span
            className={styles.trackFill}
            data-tone={tone === 'default' ? undefined : tone}
            style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
          />
        </span>
      )}
    </div>
  );

  return hint ? (
    <Tooltip label={hint} withArrow openDelay={200}>
      {body}
    </Tooltip>
  ) : (
    body
  );
}

function SummarySkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-label="Đang tải số liệu tổng hợp">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className={styles.stat}>
          <Skeleton height={9} width={56} radius="sm" mt={3} />
          <Skeleton height={18} width={44} radius="sm" mt={7} />
        </div>
      ))}
    </div>
  );
}

export function AttendanceSummaryCards({
  summary,
  scope = 'filter',
  onOpenMapping,
  chartOpened,
  onToggleChart,
}: AttendanceSummaryCardsProps) {
  if (!summary) {
    return <SummarySkeleton />;
  }

  const mappedTotal = summary.mapped + (summary.autoMapped ?? 0);
  const conflict = summary.conflict ?? 0;
  const needsAttention = summary.unmapped + conflict;

  // When the backend omits the summary, `total` is the full filtered count but
  // the per-status counts only cover the current page. Measure shares against
  // what was actually counted so the percentages stay honest.
  const countedStatus =
    summary.present + summary.late + summary.absent + summary.singlePunch + summary.unknown;
  const base = scope === 'filter' ? summary.total : countedStatus;
  const share = (value: number) => (base > 0 ? (value / base) * 100 : 0);

  const totalHint =
    scope === 'page'
      ? 'Tổng bản ghi khớp bộ lọc. Phân loại theo trạng thái bên cạnh tính trên trang đang xem.'
      : 'Tính trên toàn bộ bản ghi khớp bộ lọc hiện tại, không chỉ trang đang xem.';

  return (
    <div className={styles.root}>
      <Stat label="Tổng bản ghi" value={summary.total} tone="default" hint={totalHint} />

      <Stat
        label="Đủ công"
        value={summary.present}
        share={share(summary.present)}
        tone="positive"
        hint="Có đủ giờ vào và ra, vào ca không quá mốc đi muộn của ca."
      />
      <Stat
        label="Đi muộn"
        value={summary.late}
        tone={summary.late > 0 ? 'warning' : 'muted'}
        hint="Giờ vào trễ hơn giờ bắt đầu ca cộng dung sai đi muộn được cấu hình trong Ca làm việc."
      />
      <Stat
        label="Chấm 1 lần"
        value={summary.singlePunch}
        tone={summary.singlePunch > 0 ? 'warning' : 'muted'}
        hint="Chỉ ghi nhận một lần chấm nên chưa xác định được giờ ra."
      />
      <Stat
        label="Vắng"
        value={summary.absent}
        tone={summary.absent > 0 ? 'danger' : 'muted'}
        hint="Ngày làm việc theo ca nhưng không có lần chấm nào."
      />
      {summary.unknown > 0 && (
        <Stat
          label="Không rõ"
          value={summary.unknown}
          tone="muted"
          hint="Chưa phân giải được ca hoặc giờ chấm không hợp lệ. Kiểm tra phân ca trước khi kết luận."
        />
      )}

      <Stat
        label="Đã map"
        value={mappedTotal}
        share={share(mappedTotal)}
        tone="positive"
        groupStart
        hint="Bản ghi đã liên kết được với nhân sự trong HRM."
      />
      <Stat
        label="Chưa map"
        value={summary.unmapped}
        tone={summary.unmapped > 0 ? 'warning' : 'muted'}
        hint="Chưa liên kết với nhân sự HRM nên không lên lịch cá nhân và bảng công."
      />
      {conflict > 0 && (
        <Stat label="Trùng mã" value={conflict} tone="danger" hint="Một mã chấm công khớp nhiều nhân sự." />
      )}

      <div className={styles.spacer} />

      {(onToggleChart || (needsAttention > 0 && onOpenMapping)) && (
        <div className={styles.action}>
          {onToggleChart && (
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={onToggleChart}
              leftSection={<IconChartBar size={14} />}
              aria-expanded={chartOpened}
            >
              {chartOpened ? 'Ẩn biểu đồ' : 'Biểu đồ'}
            </Button>
          )}
          {needsAttention > 0 && onOpenMapping && (
            <Button size="xs" variant="light" color="orange" onClick={onOpenMapping}>
              Xử lý mapping ({needsAttention.toLocaleString('vi-VN')})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
