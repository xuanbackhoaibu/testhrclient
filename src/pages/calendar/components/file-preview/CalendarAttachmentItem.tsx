/**
 * @fileoverview Một dòng file đính kèm lịch. Dùng ở 2 chỗ với hành vi khác
 * nhau:
 *  - Trong form tạo/sửa lịch (CalendarAttachmentDropzone): để XOÁ file khỏi
 *    danh sách sẽ lưu (file mới chọn chưa upload, hoặc file cũ đã lưu trên
 *    server) — không mở xem trước ở đây, nên không truyền `onOpen`.
 *  - Trong chi tiết sự kiện (EventDetailModal): chỉ để XEM — bấm vào xin lại
 *    URL tải mới nhất rồi mở file thật ở tab mới (`onOpen`), không có nút
 *    xoá (không truyền `onRemove`).
 * Cả hai đều tuỳ chọn nên component tự quyết có bấm được / có nút xoá hay
 * không tuỳ theo props được truyền vào.
 */
import { ActionIcon, Text, UnstyledButton } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { getMimePreviewType } from './mimeRegistry';
import { formatFileSize, getIconTypeFromPreviewType } from './filePreviewUtils';
import { truncateFilename } from './truncateFilename';
import { FileTypeIcon } from './FileTypeIcon';

/** Metadata tối thiểu để hiển thị 1 dòng file — dùng chung cho file cục bộ (File) và file đã lưu trên server (CalendarAttachmentDto). */
export interface CalendarAttachmentItemMeta {
  name: string;
  size: number | null;
  mimeType: string | null;
}

interface CalendarAttachmentItemProps {
  file: CalendarAttachmentItemMeta;
  /** Mở lightbox xem trước — bỏ qua nếu dòng này không cho xem trước tại chỗ. */
  onOpen?: () => void;
  /** Cho xoá khỏi danh sách — bỏ qua nếu dòng này chỉ để xem (đã lưu). */
  onRemove?: () => void;
  /** Đã lưu thật trên server (khác với file vừa chọn, chưa upload). */
  isSaved?: boolean;
}

export function CalendarAttachmentItem({ file, onOpen, onRemove, isSaved }: CalendarAttachmentItemProps) {
  const previewType = getMimePreviewType(file.mimeType ?? '', file.name);
  const iconType = getIconTypeFromPreviewType(previewType);

  const content = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileTypeIcon type={iconType} fileName={file.name} size={20} />
      </div>
      <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
        <Text size="xs" fw={500} truncate title={file.name}>
          {truncateFilename(file.name, 28)}
        </Text>
        <Text size="10px" c="dimmed">
          {file.size != null ? formatFileSize(file.size) : ''}
          {isSaved ? (file.size != null ? ' · Đã lưu' : 'Đã lưu') : ''}
        </Text>
      </div>
      {onRemove && (
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Xoá ${file.name}`}
        >
          <IconX size={14} />
        </ActionIcon>
      )}
    </>
  );

  const style = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 'var(--mantine-radius-sm)',
    border: '1px solid var(--mantine-color-gray-3)',
    maxWidth: 260,
  } as const;

  if (onOpen) {
    return (
      <UnstyledButton onClick={onOpen} style={style}>
        {content}
      </UnstyledButton>
    );
  }

  return <div style={style}>{content}</div>;
}

export default CalendarAttachmentItem;
