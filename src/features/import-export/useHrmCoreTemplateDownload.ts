import { message } from 'antd';
import { useMutation } from '@tanstack/react-query';

import { downloadHrmCoreTemplate } from './excelFilesApi';

export function useHrmCoreTemplateDownload() {
  const mutation = useMutation({
    mutationFn: downloadHrmCoreTemplate,
    onError: () => message.error('Tải mẫu Excel thất bại.'),
  });

  return {
    downloadTemplate: () => mutation.mutateAsync(),
    isDownloadingTemplate: mutation.isPending,
  };
}
