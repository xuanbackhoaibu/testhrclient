import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import { listOffboardingInstances, listOffboardingTemplates } from './offboardingApi';

export function useOffboarding(params: ListQueryParams) {
  return useQuery({
    queryKey: ['offboarding', params],
    queryFn: async () => {
      const [instances, templates] = await Promise.all([
        listOffboardingInstances(params),
        listOffboardingTemplates(params),
      ]);
      return { instances, templates };
    },
  });
}

