import { Alert, Anchor, Skeleton } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import type { AttendanceSyncStatus } from '../../../features/attendance/attendanceTypes';
import styles from './AttendanceSyncStatusCard.module.css';

interface AttendanceSyncStatusCardProps {
  status: AttendanceSyncStatus | undefined;
  isLoading: boolean;
  onViewSyncHistory: () => void;
  mayViewSyncLog: boolean;
}

type SyncJob = AttendanceSyncStatus['dailyToday'];

interface ResolvedState {
  state: 'running' | 'error' | 'ok' | 'idle';
  /** Job whose state won, used for the timestamp and error message. */
  job: SyncJob | undefined;
  label: string;
}

const JOB_LABELS = {
  dailyToday: 'Đồng bộ hôm nay',
  nightly7Days: 'Đồng bộ đêm',
  manualSync: 'Đồng bộ thủ công',
} as const;

/**
 * Collapses the three sync jobs into the single state worth surfacing:
 * running beats error, error beats success, success beats idle.
 */
function resolveState(status: AttendanceSyncStatus): ResolvedState {
  const candidates: { job: SyncJob; label: string }[] = [
    { job: status.dailyToday, label: JOB_LABELS.dailyToday },
    { job: status.nightly7Days, label: JOB_LABELS.nightly7Days },
    { job: status.manualSync, label: JOB_LABELS.manualSync },
  ];
  const jobs = candidates.filter(
    (entry): entry is { job: NonNullable<SyncJob>; label: string } =>
      Boolean(entry.job),
  );

  const running = jobs.find((entry) => entry.job.isRunning);
  if (running) return { state: 'running', job: running.job, label: running.label };

  const failed = jobs.find((entry) => entry.job.lastError);
  if (failed) return { state: 'error', job: failed.job, label: failed.label };

  const succeeded = jobs
    .filter((entry) => entry.job.lastSuccessAt)
    .sort((a, b) => dayjs(b.job.lastSuccessAt!).valueOf() - dayjs(a.job.lastSuccessAt!).valueOf())[0];
  if (succeeded) return { state: 'ok', job: succeeded.job, label: succeeded.label };

  return { state: 'idle', job: undefined, label: 'Đồng bộ' };
}

export function AttendanceSyncStatusCard({
  status,
  isLoading,
  onViewSyncHistory,
  mayViewSyncLog,
}: AttendanceSyncStatusCardProps) {
  if (isLoading) {
    return (
      <div className={styles.root} aria-busy="true" aria-label="Đang tải trạng thái đồng bộ">
        <Skeleton height={8} circle />
        <Skeleton height={10} width={220} radius="sm" />
        <div className={styles.spacer} />
        <Skeleton height={10} width={110} radius="sm" />
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const resolved = resolveState(status);

  return (
    <>
      {!status.hasAttendanceData && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />} py={8} mb="xs">
          Chưa có dữ liệu chấm công được đồng bộ. Hãy chạy đồng bộ hoặc kiểm tra cấu hình BioTime.
        </Alert>
      )}

      <div className={styles.root} data-state={resolved.state}>
        <span className={styles.dot} data-state={resolved.state} aria-hidden="true" />

        <span className={styles.text}>
          {resolved.state === 'running' && <>{resolved.label} đang chạy…</>}

          {resolved.state === 'error' && (
            <>
              {resolved.label} thất bại
              {resolved.job?.lastErrorAt && (
                <> lúc {dayjs(resolved.job.lastErrorAt).format('DD/MM HH:mm')}</>
              )}
              <span className={styles.sep}> · </span>
              <span className={styles.errorText} title={resolved.job?.lastError ?? undefined}>
                {resolved.job?.lastError}
              </span>
            </>
          )}

          {resolved.state === 'ok' && resolved.job?.lastSuccessAt && (
            <>
              {resolved.label} lúc{' '}
              <span className={styles.strong}>
                {dayjs(resolved.job.lastSuccessAt).format('DD/MM HH:mm')}
              </span>
            </>
          )}

          {resolved.state === 'idle' && <>Chưa chạy đồng bộ lần nào</>}
        </span>

        <span className={styles.sep} aria-hidden="true">
          ·
        </span>

        <span className={styles.text}>
          <span className={styles.strong}>{status.attendanceTotal.toLocaleString('vi-VN')}</span> bản ghi
        </span>

        <span className={styles.sep} aria-hidden="true">
          ·
        </span>

        <span className={styles.text}>
          <span className={styles.strong}>{status.departmentTotal.toLocaleString('vi-VN')}</span> phòng ban
        </span>

        <div className={styles.spacer} />

        {mayViewSyncLog && (
          <Anchor component="button" type="button" size="sm" onClick={onViewSyncHistory}>
            Lịch sử đồng bộ
          </Anchor>
        )}
      </div>
    </>
  );
}
