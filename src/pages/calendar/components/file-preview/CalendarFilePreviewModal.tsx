/**
 * @fileoverview CalendarFilePreviewModal — lightbox xem trước file đính kèm
 * lịch, giao diện dựng theo kiểu xem file của Zalo web: nền sáng toàn màn
 * hình, thanh dưới cùng có icon/tên/dung lượng file bên trái và nút tải về
 * /đóng bên phải, thanh zoom nổi "100% ⌄ ⛶" phía trên thanh dưới cùng khi
 * xem ảnh hoặc tài liệu Word/Excel, mũi tên chuyển file hai bên khi có
 * nhiều file đính kèm.
 *
 * Hỗ trợ 2 nguồn file:
 *  - `local`: File vừa chọn trong form, CHƯA lưu lên server — tạo `blob:`
 *    URL tại chỗ bằng `URL.createObjectURL`.
 *  - `remote`: file đã lưu thật trên server (xem ở EventDetailModal). URL là
 *    presigned, TTL ngắn, nên mỗi lần mở/chuyển sang file này ta gọi lại
 *    `resolveUrl()` (do component cha truyền vào, thường bọc quanh
 *    `calendarApi.getAttachmentDownloadUrl`) để xin URL mới nhất trước khi
 *    hiển thị, thay vì dùng URL cũ có thể đã hết hạn.
 *
 * PORTAL: component này được mở từ bên trong một Mantine `<Modal>` khác
 * (form tạo/sửa lịch, hoặc chi tiết sự kiện) — mà Mantine áp `transform` lên
 * khung modal cha để chạy hiệu ứng đóng/mở. `transform` trên tổ tiên tạo ra
 * "containing block" mới cho phần tử `position: fixed`, nên nếu render trực
 * tiếp trong cây DOM của Modal cha, lightbox toàn màn hình này sẽ bị "nhốt"
 * lại vừa kích thước khung modal cha thay vì phủ kín viewport (đúng lỗi thấy
 * trên giao diện: hộp xem trước bé, lệch, có thanh cuộn riêng). Dùng
 * `createPortal` để gắn thẳng vào `document.body`, thoát khỏi cây DOM của
 * Modal cha, tránh bẫy `transform` này.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActionIcon, Avatar, Loader, Menu, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconMaximize,
  IconMinimize,
  IconMusic,
  IconX,
} from '@tabler/icons-react';
import { getMimePreviewType, type PreviewType } from './mimeRegistry';
import { formatFileSize, getIconTypeFromPreviewType } from './filePreviewUtils';
import { truncateFilename } from './truncateFilename';
import { downloadResourceWithName } from './downloadFile';
import { FileTypeIcon } from './FileTypeIcon';
import { TextPreview } from './TextPreview';
import { CsvPreview } from './CsvPreview';
import { PdfPreview } from './PdfPreview';
import { ExcelPreview } from './ExcelPreview';
import { WordPreview } from './WordPreview';
import { DocumentPreview } from './DocumentPreview';
import { ArchivePreview } from './ArchivePreview';
import styles from './CalendarFilePreviewModal.module.css';

/** File vừa chọn trong form, chưa upload. */
export interface LocalPreviewItem {
  kind: 'local';
  file: File;
}

/** File đã lưu thật trên server — URL cần xin lại (presigned, TTL ngắn) mỗi lần mở. */
export interface RemotePreviewItem {
  kind: 'remote';
  name: string;
  size: number | null;
  mimeType: string | null;
  /** Xin URL xem/tải mới nhất cho file này. Trả về null nếu không lấy được. */
  resolveUrl: () => Promise<string | null>;
  /** Người chia sẻ/tạo file — hiện avatar + tên ở hàng thông tin dưới cùng, giống Zalo. Bỏ qua nếu không có. */
  uploaderName?: string | null;
  uploaderAvatarUrl?: string | null;
}

export type CalendarPreviewItem = LocalPreviewItem | RemotePreviewItem;

interface CalendarFilePreviewModalProps {
  items: CalendarPreviewItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function CalendarFilePreviewModal({
  items,
  currentIndex,
  isOpen,
  onClose,
  onPrev,
  onNext,
}: CalendarFilePreviewModalProps) {
  const current = items[currentIndex] ?? null;
  const [scale, setScale] = useState(1);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Số trang thực tế của tài liệu Word (docx-preview render xong mới biết) — hiện "TRANG 1/N" giống Zalo.
  const [pageCount, setPageCount] = useState(1);

  // URL cho file hiện tại — blob: cho file local, URL server (xin lại mỗi lần) cho file remote.
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveFailed, setResolveFailed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset trạng thái khi mở file khác
    setScale(1);
    setResolveFailed(false);
    setPageCount(1);

    if (!isOpen || !current) {
      setObjectUrl(null);
      setIsResolving(false);
      return;
    }

    if (current.kind === 'local') {
      const url = URL.createObjectURL(current.file);
      setObjectUrl(url);
      setIsResolving(false);
      return () => URL.revokeObjectURL(url);
    }

    let cancelled = false;
    setObjectUrl(null);
    setIsResolving(true);
    current
      .resolveUrl()
      .then((url) => {
        if (cancelled) return;
        setIsResolving(false);
        if (url) setObjectUrl(url);
        else setResolveFailed(true);
      })
      .catch(() => {
        if (!cancelled) {
          setIsResolving(false);
          setResolveFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, current]);

  const fileName = current ? (current.kind === 'local' ? current.file.name : current.name) : '';
  const fileSize = current ? (current.kind === 'local' ? current.file.size : (current.size ?? undefined)) : undefined;
  const mimeType = current ? (current.kind === 'local' ? current.file.type : (current.mimeType ?? undefined)) : undefined;

  const previewType: PreviewType = useMemo(() => {
    if (!current) return 'unknown';
    return getMimePreviewType(mimeType, fileName);
  }, [current, mimeType, fileName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  // Theo dõi trạng thái toàn màn hình thật của trình duyệt để icon luôn khớp
  // (người dùng có thể thoát fullscreen bằng phím Esc thay vì bấm nút).
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isOpen && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [isOpen]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (overlayRef.current) {
      void overlayRef.current.requestFullscreen().catch(() => undefined);
    }
  };

  if (!isOpen || !current) return null;

  const displayName = truncateFilename(fileName, 48);
  const iconType = getIconTypeFromPreviewType(previewType);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  // Hàng thông tin dưới cùng: nếu biết ai tạo sự kiện (đính kèm đã lưu, mở từ
  // chi tiết sự kiện) thì hiện avatar + "Tên · dung lượng" giống Zalo; nếu
  // không (file vừa chọn trong form, chưa lưu) thì giữ icon + dung lượng như trước.
  //
  // CHỦ Ý KHÔNG hiện giờ/ngày ở đây: CalendarAttachmentDto của backend không
  // có mốc thời gian riêng cho TỪNG file đính kèm (chỉ event mới có
  // createdAt/updatedAt) — nếu dùng tạm giờ tạo sự kiện thì MỌI file trong
  // cùng sự kiện sẽ hiện chung 1 giờ dù thêm vào lúc nào, gây hiểu nhầm. Chỉ
  // nên hiện ngày giờ thật khi backend bổ sung field kiểu `uploadedAt` riêng
  // cho từng attachment.
  const uploaderName = current.kind === 'remote' ? current.uploaderName : null;
  const uploaderAvatarUrl = current.kind === 'remote' ? current.uploaderAvatarUrl : null;
  const metadataLine = [uploaderName, formatFileSize(fileSize)].filter(Boolean).join(' · ');

  const lowerName = fileName.toLowerCase();
  const isDocx = lowerName.endsWith('.docx');
  const isXlsx = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
  const isOfficeDoc = previewType === 'document' || previewType === 'spreadsheet' || previewType === 'presentation';
  // Thanh zoom nổi dùng chung cho ảnh, PDF và tài liệu Word/Excel tự dựng lại —
  // giống bản xem file .doc trong ảnh Zalo (có thanh "100% ⌄ ⛶" khi xem tài liệu).
  const isZoomable = previewType === 'image' || previewType === 'pdf' || (isOfficeDoc && (isDocx || isXlsx));

  const handleDownload = () => void downloadResourceWithName(objectUrl ?? '', fileName);

  const renderContent = () => {
    if (isResolving) {
      return (
        <div style={{ color: 'var(--mantine-color-gray-7)', textAlign: 'center' }}>
          <Loader size="sm" />
          <Text size="sm" mt={8} c="dimmed">Đang xin liên kết xem file mới nhất…</Text>
        </div>
      );
    }

    if (resolveFailed || !objectUrl) {
      return (
        <div style={{ color: 'var(--mantine-color-gray-7)', textAlign: 'center' }}>
          <IconAlertTriangle size={32} />
          <Text size="sm" mt={8} c="dimmed">
            File đang được xử lý hoặc không còn khả dụng, thử lại sau.
          </Text>
        </div>
      );
    }

    if (previewType === 'text') return <TextPreview url={objectUrl} fileName={fileName} fileSize={fileSize} />;
    if (previewType === 'csv') return <CsvPreview url={objectUrl} fileName={fileName} fileSize={fileSize} />;
    if (previewType === 'pdf') return <PdfPreview url={objectUrl} fileName={fileName} fileSize={fileSize} scale={scale} />;

    if (isOfficeDoc) {
      // blob: URL không công khai được nên Office Online (bên trong
      // DocumentPreview) sẽ tự rơi về thẻ tải về — ưu tiên tự dựng lại
      // ngay trong trình duyệt cho .docx/.xlsx trước.
      if (isDocx) return <WordPreview url={objectUrl} fileName={fileName} scale={scale} onPageCount={setPageCount} />;
      if (isXlsx) return <ExcelPreview url={objectUrl} fileName={fileName} scale={scale} />;
      return <DocumentPreview url={objectUrl} fileName={fileName} fileSize={fileSize} mimeType={mimeType} previewType={previewType} />;
    }

    if (previewType === 'archive') return <ArchivePreview url={objectUrl} fileName={fileName} fileSize={fileSize} />;

    if (previewType === 'image') {
      return (
        <div className={styles.mediaBox} onClick={(e) => e.stopPropagation()}>
          <img src={objectUrl} alt={fileName} className={styles.image} style={{ transform: `scale(${scale})` }} draggable={false} />
        </div>
      );
    }

    if (previewType === 'video') {
      return (
        <div className={styles.mediaBox} onClick={(e) => e.stopPropagation()}>
          <video src={objectUrl} controls playsInline preload="metadata" className={styles.image} />
        </div>
      );
    }

    if (previewType === 'audio') {
      return (
        <div
          style={{
            width: 'min(32rem, calc(100vw - 2rem))',
            borderRadius: 16,
            border: '1px solid var(--mantine-color-gray-3)',
            background: '#fff',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            padding: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--mantine-color-gray-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconMusic size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} truncate title={fileName}>{displayName}</Text>
              <Text size="xs" c="dimmed">{metadataLine}</Text>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <audio src={objectUrl} controls preload="metadata" style={{ width: '100%' }} />
          </div>
        </div>
      );
    }

    return (
      <div style={{ color: 'var(--mantine-color-gray-7)', textAlign: 'center' }}>
        <Text size="sm" c="dimmed">Không có bản xem trước cho định dạng này.</Text>
      </div>
    );
  };

  return createPortal(
    <div ref={overlayRef} className={styles.overlay} role="dialog" aria-modal="true" aria-label="Xem trước file">
      <div className={styles.backdrop} onClick={onClose} />

      {items.length > 1 && hasPrev && (
        <button type="button" className={`${styles.navBtn} ${styles.navLeft}`} onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="File trước">
          <IconChevronLeft size={20} />
        </button>
      )}
      {items.length > 1 && hasNext && (
        <button type="button" className={`${styles.navBtn} ${styles.navRight}`} onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="File sau">
          <IconChevronRight size={20} />
        </button>
      )}

      <div className={`${styles.content} ${isZoomable ? styles.contentWithToolbar : ''}`}>{renderContent()}</div>

      {/* Chân màn hình kiểu Zalo: hàng công cụ (số trang/zoom) phía trên + hàng thông tin file phía dưới. */}
      <div className={styles.bottomChrome} onClick={(e) => e.stopPropagation()}>
        {isZoomable && (
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarLeft}>
              <FileTypeIcon type={iconType} fileName={fileName} size={16} />
              {isOfficeDoc && isDocx && <span>Trang 1/{pageCount}</span>}
            </div>
            <div className={styles.toolbarRight}>
              <Menu shadow="md" width={120} position="top-end" withinPortal={false}>
                <Menu.Target>
                  <button type="button" className={styles.zoomTrigger} aria-label="Chọn mức thu phóng">
                    {Math.round(scale * 100)}%
                    <IconChevronDown size={14} />
                  </button>
                </Menu.Target>
                <Menu.Dropdown>
                  {ZOOM_PRESETS.map((preset) => (
                    <Menu.Item key={preset} onClick={() => setScale(preset)}>
                      {Math.round(preset * 100)}%
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item onClick={() => setScale(1)}>Vừa khung hình</Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <ActionIcon
                className={styles.toolbarIconBtn}
                variant="subtle"
                size="sm"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Xem toàn màn hình'}
              >
                {isFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
              </ActionIcon>
            </div>
          </div>
        )}

        <div className={styles.bottomBar}>
          <div className={styles.bottomBarLeft}>
            {uploaderName ? (
              <Avatar src={uploaderAvatarUrl ?? undefined} name={uploaderName} color="initials" radius="xl" size={32} />
            ) : (
              <FileTypeIcon type={iconType} fileName={fileName} size={22} />
            )}
            <div style={{ minWidth: 0 }}>
              <div className={styles.fileName} title={fileName}>{displayName}</div>
              <div className={styles.fileMeta}>
                {metadataLine}
                {items.length > 1 && ` · ${currentIndex + 1}/${items.length}`}
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <ActionIcon className={styles.actionBtn} variant="subtle" onClick={handleDownload} aria-label="Tải về">
              <IconDownload size={18} />
            </ActionIcon>
            <div className={styles.actionDivider} />
            <ActionIcon className={styles.actionBtn} variant="subtle" onClick={onClose} aria-label="Đóng">
              <IconX size={18} />
            </ActionIcon>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default CalendarFilePreviewModal;
