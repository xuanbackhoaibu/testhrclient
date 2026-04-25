import { useQuery } from '@tanstack/react-query';

import { getDashboardSummary } from './dashboardApi';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });
}

