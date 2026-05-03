import { useQuery } from '@tanstack/react-query';

import type { ListQueryParams } from '../../shared/types/api';
import {
  listBusinessSectors,
  listBusinessSectorsOptions,
} from './businessSectorsApi';

export function useBusinessSectors(params: ListQueryParams) {
  return useQuery({
    queryKey: ['business-sectors', params],
    queryFn: () => listBusinessSectors(params),
  });
}

export function useBusinessSectorsOptions() {
  return useQuery({
    queryKey: ['business-sectors', 'options'],
    queryFn: listBusinessSectorsOptions,
  });
}

export function useBusinessSectorsSelect() {
  return useBusinessSectorsOptions();
}
