/**
 * @fileoverview useCalendarFilePreview — điều khiển trạng thái modal xem
 * trước file đính kèm lịch. Rút gọn từ `chat-web-client/src/hooks/useFilePreview.ts`:
 * bỏ phần xin URL ký (signed URL) qua API vì file đính kèm lịch hiện được xem
 * trực tiếp từ File cục bộ (chưa có endpoint lưu trữ ở backend) — xem ghi chú
 * trong CalendarAttachmentDropzone.tsx.
 */
import { useCallback, useState } from 'react';

export interface UseCalendarFilePreviewReturn {
  isOpen: boolean;
  currentIndex: number;
  open: (index: number) => void;
  close: () => void;
  prev: () => void;
  next: () => void;
}

export function useCalendarFilePreview(totalItems: number): UseCalendarFilePreviewReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const prev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrentIndex((i) => Math.min(totalItems - 1, i + 1)), [totalItems]);

  return { isOpen, currentIndex, open, close, prev, next };
}

export default useCalendarFilePreview;
