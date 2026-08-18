import { useQuery } from '@tanstack/react-query';

import { getDashboardSummary, type DashboardSummaryParams } from './dashboardApi';

export function useDashboardSummary(params: DashboardSummaryParams = {}) {
  return useQuery({
    queryKey: ['dashboard-summary', params],
    queryFn: () => getDashboardSummary(params),
  });
}
