/**
 * @fileoverview Xem trước PDF bằng iframe (trình duyệt tự render) — chuyển
 * thể từ chat-web's PdfPreview. Thêm `#toolbar=0&navpanes=0` vào URL để ẩn
 * thanh công cụ PDF mặc định của trình duyệt (Chrome/Edge) — tránh 2 thanh
 * công cụ chồng nhau vì modal cha (CalendarFilePreviewModal) đã có thanh
 * zoom/toàn màn hình riêng, đồng bộ với Word/Excel/Ảnh. Firefox/Safari không
 * hỗ trợ tham số này nên sẽ vẫn hiện thanh công cụ gốc của trình duyệt đó —
 * không lỗi, chỉ không ẩn được, chấp nhận được vì đa số máy trong công ty
 * dùng Chrome/Edge.
 */
import { useCallback, useState } from 'react';
import { Button, Loader, Text } from '@mantine/core';
import { IconAlertTriangle, IconDownload, IconExternalLink } from '@tabler/icons-react';
import { downloadResourceWithName } from './downloadFile';
import styles from './PreviewPanel.module.css';

interface PdfPreviewProps {
  url: string;
  fileName: string;
  fileSize?: number;
  /** Mức thu phóng do component cha điều khiển (mặc định 1 = 100%), giống Word/Excel/Ảnh. */
  scale?: number;
}

export function PdfPreview({ url, fileName, scale = 1 }: PdfPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleDownload = useCallback(async () => {
    await downloadResourceWithName(url, fileName || 'document.pdf');
  }, [fileName, url]);

  const handleOpenInNewTab = useCallback(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [url]);

  const embedUrl = `${url}#toolbar=0&navpanes=0`;
  const inverseScale = 100 / scale;

  return (
    <div className={styles.panel}>
      <div className={styles.panelBody} style={{ position: 'relative' }}>
        {isLoading && !hasError && (
          <div className={styles.centerState} style={{ position: 'absolute', inset: 0 }}>
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Đang tải xem trước…</Text>
          </div>
        )}
        {hasError ? (
          <div className={styles.centerState}>
            <IconAlertTriangle size={40} />
            <Text size="sm">Không hiển thị được PDF. Vui lòng mở ở tab mới.</Text>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="xs" leftSection={<IconExternalLink size={14} />} onClick={handleOpenInNewTab}>
                Mở tab mới
              </Button>
              <Button size="xs" variant="default" leftSection={<IconDownload size={14} />} onClick={() => void handleDownload()}>
                Tải về
              </Button>
            </div>
          </div>
        ) : (
          <iframe
            key={url}
            src={embedUrl}
            title={fileName || 'PDF preview'}
            className={styles.iframe}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${inverseScale}%`,
              height: `${inverseScale}%`,
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default PdfPreview;
