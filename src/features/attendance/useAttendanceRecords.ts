import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listAttendanceRecords } from './attendanceApi';

export function useAttendanceRecords(params: ListQueryParams) {
  return useQuery({
    queryKey: ['attendance-records', params],
    queryFn: () => listAttendanceRecords(params),
  });
}

