import { useMutation } from '@tanstack/react-query';

import { showDownloadError } from './downloadError';
import { downloadHrmCoreTemplate } from './excelFilesApi';

export function useHrmCoreTemplateDownload() {
  const mutation = useMutation({
    mutationFn: downloadHrmCoreTemplate,
    onError: (error) => showDownloadError(error, 'Tải mẫu Excel thất bại.'),
  });

  return {
    downloadTemplate: () => mutation.mutateAsync(),
    isDownloadingTemplate: mutation.isPending,
  };
}
