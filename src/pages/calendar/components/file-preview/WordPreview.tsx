/**
 * @fileoverview Xem trước .docx ngay trong trình duyệt bằng `docx-preview` —
 * chuyển thể từ chat-web's WordPreview. Chỉ hỗ trợ .docx (OOXML); .doc cũ
 * (binary) không đọc được → parent rơi về DocumentPreview.
 *
 * Zoom được điều khiển từ component cha (CalendarFilePreviewModal) qua prop
 * `scale`, hiển thị bằng thanh công cụ nổi chung — giống cách Zalo web xem
 * file: một thanh zoom lơ lửng dùng chung cho mọi loại file, không có thanh
 * công cụ riêng bên trong từng loại xem trước.
 */
import { useEffect, useRef, useState } from 'react';
import { Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import styles from './PreviewPanel.module.css';

interface WordPreviewProps {
  url: string;
  fileName: string;
  /** Mức thu phóng do component cha điều khiển (mặc định 1 = 100%). */
  scale?: number;
  /** Báo số trang thực tế sau khi render xong — component cha dùng để hiện "TRANG 1/N". */
  onPageCount?: (count: number) => void;
}

async function loadDocxPreview() {
  return import('docx-preview');
}

/** docx-preview (inWrapper: true) render mỗi trang thành 1 section/div con trực tiếp của .docx-wrapper. */
function countRenderedPages(container: HTMLElement): number {
  const wrapper = container.querySelector('.docx-wrapper');
  if (!wrapper) return 1;
  const pages = wrapper.querySelectorAll(':scope > section, :scope > .docx');
  return pages.length > 0 ? pages.length : 1;
}

export function WordPreview({ url, fileName, scale = 1, onPageCount }: WordPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    (async () => {
      setStatus('loading');
      try {
        const [docx, res] = await Promise.all([loadDocxPreview(), fetch(url)]);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled || !containerRef.current) return;
        await docx.renderAsync(blob, containerRef.current, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          // Word lưu các mốc phân trang đã render dưới dạng
          // `lastRenderedPageBreak`. docx-preview mặc định bỏ qua chúng,
          // khiến tài liệu dài bị dồn vào rất ít trang.
          ignoreLastRenderedPageBreak: false,
        });
        if (cancelled) return;
        setStatus('ready');
        onPageCount?.(countRenderedPages(container));
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onPageCount cố ý không nằm trong deps để tránh render lại khi cha đổi callback ref
  }, [url]);

  return (
    <div className={styles.panel} style={{ background: 'transparent' }}>
      <div className={styles.docHost} style={{ position: 'relative' }}>
        {status === 'loading' && (
          <div className={styles.centerState} style={{ position: 'absolute', inset: 0 }}>
            <Text size="sm" c="dimmed">Đang tải tài liệu…</Text>
          </div>
        )}
        {status === 'error' && (
          <div className={styles.centerState} style={{ position: 'absolute', inset: 0 }}>
            <IconAlertTriangle size={32} />
            <Text size="sm">Không xem trước được file này</Text>
          </div>
        )}
        <div
          style={{ margin: '0 auto', width: 'fit-content', transform: `scale(${scale})`, transformOrigin: 'top', visibility: status !== 'ready' ? 'hidden' : 'visible' }}
          ref={containerRef}
          aria-label={fileName}
        />
      </div>
    </div>
  );
}

export default WordPreview;
