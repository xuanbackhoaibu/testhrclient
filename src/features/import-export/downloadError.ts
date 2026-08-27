import { ApiError } from '../../shared/types/api';
import { toast } from '../../shared/utils/toast';

export function showDownloadError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError && error.statusCode === 403) {
    return;
  }

  toast.error(error instanceof ApiError ? error.message : fallbackMessage);
}
