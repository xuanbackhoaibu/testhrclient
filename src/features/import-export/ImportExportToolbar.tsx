import { Button, Space } from 'antd';
import { DownloadOutlined, FileExcelOutlined, UploadOutlined } from '@ant-design/icons';

interface ImportExportToolbarProps {
  title?: string;
  onDownloadTemplate?: () => Promise<void>;
  onImport?: () => void;
  onExport?: () => Promise<void>;
  canImport?: boolean;
  canExport?: boolean;
  isDownloadingTemplate?: boolean;
  isExporting?: boolean;
}

export function ImportExportToolbar({
  title,
  onDownloadTemplate,
  onImport,
  onExport,
  canImport = Boolean(onImport),
  canExport = Boolean(onExport),
  isDownloadingTemplate = false,
  isExporting = false,
}: ImportExportToolbarProps) {
  if (import.meta.env.DEV && onImport && !onDownloadTemplate) {
    console.warn('[ImportExportToolbar] Import Excel requires a template download handler.');
  }

  const showImport = canImport && Boolean(onImport && onDownloadTemplate);
  const showTemplate = Boolean(onDownloadTemplate);
  const showExport = canExport && Boolean(onExport);

  return (
    <Space wrap aria-label={title ?? 'Thao tác Excel'}>
      {showTemplate ? (
        <Button
          icon={<DownloadOutlined />}
          loading={isDownloadingTemplate}
          disabled={isDownloadingTemplate}
          onClick={() => void onDownloadTemplate?.()}
        >
          Tải mẫu Excel
        </Button>
      ) : null}
      {showImport ? (
        <Button icon={<UploadOutlined />} onClick={onImport}>
          Import Excel
        </Button>
      ) : null}
      {showExport ? (
        <Button
          icon={<FileExcelOutlined />}
          loading={isExporting}
          disabled={isExporting}
          onClick={() => void onExport?.()}
        >
          Xuất Excel
        </Button>
      ) : null}
    </Space>
  );
}
