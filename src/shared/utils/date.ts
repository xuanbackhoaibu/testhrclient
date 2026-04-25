import dayjs from 'dayjs';

export function formatDate(value?: string | null, format = 'DD/MM/YYYY'): string {
  if (!value) {
    return '-';
  }

  return dayjs(value).format(format);
}

export function formatDateTime(value?: string | null, format = 'DD/MM/YYYY HH:mm'): string {
  if (!value) {
    return '-';
  }

  return dayjs(value).format(format);
}

