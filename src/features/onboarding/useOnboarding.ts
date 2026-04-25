import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listOnboardingInstances, listOnboardingTemplates } from './onboardingApi';

export function useOnboarding(params: ListQueryParams) {
  return useQuery({
    queryKey: ['onboarding', params],
    queryFn: async () => {
      const [instances, templates] = await Promise.all([
        listOnboardingInstances(params),
        listOnboardingTemplates(params),
      ]);
      return { instances, templates };
    },
  });
}

