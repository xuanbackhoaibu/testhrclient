import type { ReactNode } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Modal,
  Row,
  Space,
  Statistic,
  Steps,
  Tabs,
  Typography,
  Upload,
  message,
} from 'antd';
import { DownloadOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';

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
  onResetPreview?: () => void;
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

function readSummaryNumber(summary: ImportPreviewStat[], label: string): number {
  const item = summary.find((stat) => stat.label === label);
  const value = Number(item?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function ExcelImportModal({
  open,
  onClose,
  onDownloadTemplate,
  onUpload,
  onCommit,
  onDownloadErrors,
  onResetPreview,
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
  const currentStep = hasPreview ? (hasErrors ? 1 : 2) : 0;
  const errorCount = readSummaryNumber(summary, 'Lỗi');
  const warningCount = readSummaryNumber(summary, 'Cảnh báo');
  const resultMessage = hasErrors
    ? 'Có lỗi cần xử lý'
    : hasWarnings
      ? 'Có cảnh báo cần kiểm tra'
      : 'Dữ liệu hợp lệ';
  const resultDescription = hasErrors
    ? 'Tải file lỗi hoặc mở tab Lỗi để xem chi tiết, sau đó sửa file và upload lại.'
    : hasWarnings
      ? 'Kiểm tra tab Cảnh báo trước khi xác nhận import.'
      : 'Bạn có thể xác nhận import sau khi đã kiểm tra preview.';

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
        hasPreview && onResetPreview ? (
          <Button
            key="reset"
            icon={<ReloadOutlined />}
            disabled={isUploading || isCommitting}
            onClick={onResetPreview}
          >
            Chọn file khác
          </Button>
        ) : null,
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
      <Space orientation="vertical" size={16} style={{ width: '100%' }} className="excel-import-modal">
        <Card size="small" className="excel-import-guide">
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <Steps
              size="small"
              current={currentStep}
              items={[
                { title: 'Tải mẫu' },
                { title: 'Kiểm tra file' },
                { title: 'Xác nhận' },
              ]}
            />
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
            </Space>
          </Space>
        </Card>

        {!hasPreview ? (
          <Upload.Dragger
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            showUploadList={false}
            disabled={isUploading}
            beforeUpload={(file) => {
              if (!isExcelFile(file) || !file.name.toLowerCase().endsWith('.xlsx')) {
                message.error('Chỉ chấp nhận file Excel .xlsx.');
                return Upload.LIST_IGNORE;
              }
              void onUpload(file);
              return false;
            }}
            className="excel-import-dropzone"
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <Typography.Text strong>
              {isUploading ? 'Đang kiểm tra file...' : 'Kéo thả hoặc chọn file Excel'}
            </Typography.Text>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Chỉ nhận file .xlsx theo mẫu của hệ thống.
            </Typography.Paragraph>
          </Upload.Dragger>
        ) : null}

        {hasPreview ? (
          <Alert
            type={hasErrors ? 'error' : hasWarnings ? 'warning' : 'success'}
            showIcon
            message={resultMessage}
            description={resultDescription}
            action={
              hasErrors || onResetPreview ? (
                <Space wrap>
                  {hasErrors && onDownloadErrors ? (
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      loading={isDownloadingErrors}
                      onClick={() => void onDownloadErrors()}
                    >
                      Tải file lỗi
                    </Button>
                  ) : null}
                  {onResetPreview ? (
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      disabled={isUploading || isCommitting}
                      onClick={onResetPreview}
                    >
                      Chọn file khác
                    </Button>
                  ) : null}
                </Space>
              ) : undefined
            }
          />
        ) : null}

        {summary.length ? (
          <Row gutter={[12, 12]}>
            {summary.map((item) => (
              <Col key={item.label} xs={12} sm={8} md={6}>
                <Card size="small" className="excel-import-stat">
                  <Statistic title={item.label} value={item.value} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : null}

        {hasPreview ? (
          <Tabs
            items={[
              { key: 'preview', label: 'Preview', children: previewContent },
              {
                key: 'errors',
                label: <Badge count={errorCount} size="small">Lỗi</Badge>,
                children: errorsContent,
              },
              {
                key: 'warnings',
                label: <Badge count={warningCount} size="small">Cảnh báo</Badge>,
                children: warningsContent,
              },
            ]}
          />
        ) : null}
      </Space>
    </Modal>
  );
}
