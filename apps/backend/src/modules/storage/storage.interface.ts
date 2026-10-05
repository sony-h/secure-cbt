export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface IStorageService {
  uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    subfolder?: string,
  ): Promise<UploadResult>;
  deleteFile(fileUrl: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
