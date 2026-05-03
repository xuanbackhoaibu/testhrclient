import { api } from '../../shared/api/httpClient';
import type { BusinessSectorOption } from './organizationTypes';

export async function listBusinessSectorsSelect(): Promise<BusinessSectorOption[]> {
  return api.get<BusinessSectorOption[]>('/catalogs/business-sectors/select');
}
