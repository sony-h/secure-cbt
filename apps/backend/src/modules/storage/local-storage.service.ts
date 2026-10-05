import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageService, UploadResult } from './storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadRootDir: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.uploadRootDir = path.join(process.cwd(), 'storage', 'uploads');
    this.baseUrl = (this.config.get<string>('API_URL') ||
      this.config.get<string>('APP_URL') ||
      '').replace(/\/+$/, '');

    if (!fs.existsSync(this.uploadRootDir)) {
      fs.mkdirSync(this.uploadRootDir, { recursive: true });
    }
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    subfolder = 'questions',
  ): Promise<UploadResult> {
    const targetDir = path.join(this.uploadRootDir, subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    const relativePath = `/uploads/${subfolder}/${filename}`;
    const url = this.baseUrl ? `${this.baseUrl}${relativePath}` : relativePath;

    this.logger.log(`Stored file locally: ${filePath} -> ${url}`);

    return {
      url,
      filename,
      size: buffer.length,
      mimeType,
    };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const match = fileUrl.match(/\/uploads\/(.+)$/);
      if (match && match[1]) {
        const filePath = path.join(this.uploadRootDir, match[1]);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          this.logger.log(`Deleted file locally: ${filePath}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to delete local file for ${fileUrl}: ${err}`);
    }
  }
}
