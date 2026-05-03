import { useQuery } from '@tanstack/react-query';

import { listBusinessSectorsSelect } from './businessSectorsApi';

export function useBusinessSectorsSelect() {
  return useQuery({
    queryKey: ['business-sectors', 'select'],
    queryFn: listBusinessSectorsSelect,
  });
}
