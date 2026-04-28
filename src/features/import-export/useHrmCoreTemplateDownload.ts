import { useMutation } from '@tanstack/react-query';

import { showDownloadError } from './downloadError';
import { downloadHrmCoreTemplate, downloadImportTemplate, type ExcelDomainKey } from './excelFilesApi';

export function useHrmCoreTemplateDownload(domainKey?: ExcelDomainKey) {
  const mutation = useMutation({
    mutationFn: () => (domainKey ? downloadImportTemplate(domainKey) : downloadHrmCoreTemplate()),
    onError: (error) => showDownloadError(error, 'Tải mẫu Excel thất bại.'),
  });

  return {
    downloadTemplate: () => mutation.mutateAsync(),
    isDownloadingTemplate: mutation.isPending,
  };
}
