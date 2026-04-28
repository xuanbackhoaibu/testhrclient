import type { ReactNode } from 'react';
import { Alert, Button, Modal, Space, Statistic, Tabs, Upload, message } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';

import { isExcelFile } from '../../shared/utils/excel';

export interface ImportPreviewStat {
  label: string;
  value: number | string;
}

interface ExcelImportModalProps {
  open: boolean;
  onClose: () => void;
  onDownloadTemplate: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onCommit?: () => Promise<void>;
  onDownloadErrors?: () => Promise<void>;
  title?: string;
  description?: string;
  summary?: ImportPreviewStat[];
  previewContent?: ReactNode;
  errorsContent?: ReactNode;
  warningsContent?: ReactNode;
  hasPreview?: boolean;
  hasErrors?: boolean;
  hasWarnings?: boolean;
  canCommit?: boolean;
  isDownloadingTemplate?: boolean;
  isUploading?: boolean;
  isCommitting?: boolean;
  isDownloadingErrors?: boolean;
}

export function ExcelImportModal({
  open,
  onClose,
  onDownloadTemplate,
  onUpload,
  onCommit,
  onDownloadErrors,
  title = 'Import dữ liệu từ Excel',
  description = 'Vui lòng tải mẫu Excel, điền dữ liệu và upload lại file đã hoàn thiện.',
  summary = [],
  previewContent,
  errorsContent,
  warningsContent,
  hasPreview = false,
  hasErrors = false,
  hasWarnings = false,
  canCommit = false,
  isDownloadingTemplate = false,
  isUploading = false,
  isCommitting = false,
  isDownloadingErrors = false,
}: ExcelImportModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      width={1080}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        onDownloadErrors ? (
          <Button
            key="errors"
            icon={<DownloadOutlined />}
            disabled={!hasPreview || !hasErrors}
            loading={isDownloadingErrors}
            onClick={() => void onDownloadErrors()}
          >
            Tải file lỗi
          </Button>
        ) : null,
        onCommit ? (
          <Button
            key="commit"
            type="primary"
            disabled={!canCommit || hasErrors}
            loading={isCommitting}
            onClick={() => void onCommit()}
          >
            Xác nhận import
          </Button>
        ) : null,
      ]}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="Quy trình import"
          description={description}
        />
        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            loading={isDownloadingTemplate}
            disabled={isDownloadingTemplate}
            onClick={() => void onDownloadTemplate()}
          >
            Tải mẫu Excel
          </Button>
          <Upload
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            showUploadList={false}
            beforeUpload={(file) => {
              if (!isExcelFile(file) || !file.name.toLowerCase().endsWith('.xlsx')) {
                message.error('Chỉ chấp nhận file Excel .xlsx.');
                return Upload.LIST_IGNORE;
              }
              void onUpload(file);
              return false;
            }}
          >
            <Button icon={<UploadOutlined />} loading={isUploading}>
              Chọn file Excel
            </Button>
          </Upload>
        </Space>

        {hasPreview ? (
          <Alert
            type={hasErrors ? 'error' : hasWarnings ? 'warning' : 'success'}
            showIcon
            message={hasErrors ? 'Có lỗi cần xử lý' : 'Dữ liệu hợp lệ'}
            description={
              hasErrors
                ? 'Vui lòng tải file lỗi, sửa dữ liệu và upload lại trước khi import.'
                : hasWarnings
                  ? 'Dữ liệu có cảnh báo. Hãy kiểm tra trước khi xác nhận import.'
                  : 'Bạn có thể xác nhận import sau khi đã kiểm tra preview.'
            }
          />
        ) : null}

        {summary.length ? (
          <Space wrap>
            {summary.map((item) => (
              <Statistic key={item.label} title={item.label} value={item.value} />
            ))}
          </Space>
        ) : null}

        {hasPreview ? (
          <Tabs
            items={[
              { key: 'preview', label: 'Preview', children: previewContent },
              { key: 'errors', label: 'Lỗi', children: errorsContent },
              { key: 'warnings', label: 'Cảnh báo', children: warningsContent },
            ]}
          />
        ) : null}
      </Space>
    </Modal>
  );
}
