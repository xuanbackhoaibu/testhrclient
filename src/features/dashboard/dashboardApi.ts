import { httpClient } from '../../shared/api/httpClient';
import { getMockDashboardSummary } from '../../shared/mocks/mockDashboard';
import { mockDelay } from '../../shared/mocks/mockHelpers';
import type { DashboardSummary } from './dashboardTypes';

const isMockMode = import.meta.env.VITE_USE_MOCKS === 'true';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (isMockMode) {
    await mockDelay();
    return getMockDashboardSummary();
  }

  const response = await httpClient.get<DashboardSummary>('/dashboard/summary');
  return response.data;
}

