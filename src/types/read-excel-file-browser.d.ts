declare module 'read-excel-file/browser' {
  export interface ReadXlsxFileOptions {
    sheet?: string | number;
    getSheets?: boolean;
    schema?: unknown;
    [key: string]: unknown;
  }

  export default function readXlsxFile(
    file: File | Blob,
    options?: ReadXlsxFileOptions,
  ): Promise<unknown>;
}
