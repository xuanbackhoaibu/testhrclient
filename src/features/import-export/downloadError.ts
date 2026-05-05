import { message } from 'antd';

import { ApiError } from '../../shared/types/api';

export function showDownloadError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError && error.statusCode === 403) {
    return;
  }

  message.error(error instanceof ApiError ? error.message : fallbackMessage);
}
