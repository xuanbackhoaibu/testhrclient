/**
 * @fileoverview FileTypeIcon — icon theo loại file, chuyển thể từ
 * `chat-web-client/src/components/message/FileTypeIcon.tsx` sang
 * @tabler/icons-react (bộ icon sẵn có của hr-web-client) thay vì Heroicons.
 *
 * Word/Excel/PowerPoint/PDF dùng khối glyph chữ cái trên nền màu thương hiệu
 * (giống Zalo/Teams/chat-web) — nhận ra loại file trong nháy mắt.
 */
import {
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFileText,
  IconFileZip,
  IconFile,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { FileIconType } from './filePreviewUtils';

interface FileTypeIconProps {
  type: FileIconType;
  fileName?: string;
  size?: number;
  className?: string;
}

const BRAND = {
  word: '#2B579A',
  excel: '#217346',
  powerpoint: '#D24726',
  pdf: '#D32F2F',
} as const;

function OfficeGlyph({ color, label, size }: { color: string; label: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundColor: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}

/**
 * Chỉ gán glyph Office thật khi tên file khớp đúng đuôi — tránh gán nhãn sai
 * (vd. .csv rơi vào `spreadsheet` chung nhưng không phải Excel thật).
 */
function officeGlyphFor(type: FileIconType, fileName: string | undefined): ReactNode | null {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (type === 'pdf') return <OfficeGlyph color={BRAND.pdf} label="PDF" size={24} />;
  if (type === 'document' && (ext === 'doc' || ext === 'docx'))
    return <OfficeGlyph color={BRAND.word} label="W" size={24} />;
  if (type === 'spreadsheet' && (ext === 'xls' || ext === 'xlsx'))
    return <OfficeGlyph color={BRAND.excel} label="X" size={24} />;
  if (type === 'presentation' && (ext === 'ppt' || ext === 'pptx'))
    return <OfficeGlyph color={BRAND.powerpoint} label="P" size={24} />;
  return null;
}

export function FileTypeIcon({ type, fileName, size = 20, className }: FileTypeIconProps) {
  const glyph = officeGlyphFor(type, fileName);
  if (glyph) return <span className={className}>{glyph}</span>;

  switch (type) {
    case 'image':
      return <IconPhoto size={size} className={className} />;
    case 'video':
      return <IconVideo size={size} className={className} />;
    case 'audio':
      return <IconMusic size={size} className={className} />;
    case 'spreadsheet':
    case 'presentation':
    case 'document':
      return <IconFileText size={size} className={className} />;
    case 'archive':
      return <IconFileZip size={size} className={className} />;
    default:
      return <IconFile size={size} className={className} />;
  }
}

export default FileTypeIcon;
