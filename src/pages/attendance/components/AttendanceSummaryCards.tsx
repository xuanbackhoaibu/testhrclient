import { Button, Skeleton } from '@mantine/core';
import type { AttendanceSummary } from '../../../features/attendance/attendanceTypes';
import styles from './AttendanceSummaryCards.module.css';

interface AttendanceSummaryCardsProps {
  summary: AttendanceSummary | undefined;
  /** Opens the mapping screen; the CTA is hidden when omitted. */
  onOpenMapping?: () => void;
}

type Tone = 'default' | 'warning' | 'danger' | 'muted';

interface StatProps {
  label: string;
  value: number;
  /** Percentage of total, rendered under the value when provided. */
  share?: number;
  tone?: Tone;
  /** Starts a new visual group: drops the divider on the left. */
  groupStart?: boolean;
}

function Stat({ label, value, share, tone = 'default', groupStart }: StatProps) {
  return (
    <div className={groupStart ? `${styles.stat} ${styles.groupStart}` : styles.stat}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} data-tone={tone === 'default' ? undefined : tone}>
        {value.toLocaleString('vi-VN')}
      </span>
      {share !== undefined && (
        <span className={styles.share}>{share.toFixed(0)}%</span>
      )}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className={styles.root} aria-busy="true" aria-label="Đang tải số liệu tổng hợp">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className={styles.stat}>
          <Skeleton height={9} width={56} radius="sm" mt={3} />
          <Skeleton height={16} width={40} radius="sm" mt={6} />
        </div>
      ))}
    </div>
  );
}

export function AttendanceSummaryCards({ summary, onOpenMapping }: AttendanceSummaryCardsProps) {
  if (!summary) {
    return <SummarySkeleton />;
  }

  const share = (value: number) => (summary.total > 0 ? (value / summary.total) * 100 : 0);
  const mappedTotal = summary.mapped + summary.autoMapped;
  const needsAttention = summary.unmapped + summary.conflict;

  return (
    <div className={styles.root}>
      <Stat label="Bản ghi trang này" value={summary.total} />
      <Stat label="Đủ công" value={summary.present} share={share(summary.present)} />
      <Stat label="Đi muộn" value={summary.late} tone={summary.late > 0 ? 'warning' : 'muted'} />
      <Stat label="Chấm 1 lần" value={summary.singlePunch} tone={summary.singlePunch > 0 ? 'warning' : 'muted'} />
      <Stat label="Vắng" value={summary.absent} tone={summary.absent > 0 ? 'danger' : 'muted'} />

      <Stat label="Đã map" value={mappedTotal} share={share(mappedTotal)} groupStart />
      <Stat label="Chưa map" value={summary.unmapped} tone={summary.unmapped > 0 ? 'warning' : 'muted'} />
      <Stat label="Trùng mã" value={summary.conflict} tone={summary.conflict > 0 ? 'danger' : 'muted'} />

      <div className={styles.spacer} />

      {needsAttention > 0 && onOpenMapping && (
        <div className={styles.action}>
          <Button size="xs" variant="light" color="orange" onClick={onOpenMapping}>
            Xử lý mapping ({needsAttention.toLocaleString('vi-VN')})
          </Button>
        </div>
      )}
    </div>
  );
}
