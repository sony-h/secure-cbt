import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { IStorageService, UploadResult } from './storage.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private client: Minio.Client | null = null;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const endPoint = this.config.get<string>('S3_ENDPOINT') || this.config.get<string>('MINIO_ENDPOINT') || 'localhost';
    const port = Number(this.config.get<string>('S3_PORT') || this.config.get<string>('MINIO_PORT') || 9000);
    const useSSL = this.config.get<string>('S3_USE_SSL') === 'true';
    const accessKey = this.config.get<string>('S3_ACCESS_KEY') || this.config.get<string>('MINIO_ACCESS_KEY') || '';
    const secretKey = this.config.get<string>('S3_SECRET_KEY') || this.config.get<string>('MINIO_SECRET_KEY') || '';
    this.bucketName = this.config.get<string>('S3_BUCKET') || 'secure-cbt-media';
    this.publicUrl = (this.config.get<string>('S3_PUBLIC_URL') || '').replace(/\/+$/, '');

    if (accessKey && secretKey) {
      this.client = new Minio.Client({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });
      this.initBucket();
    } else {
      this.logger.warn('S3 credentials not provided. S3StorageService will not be functional.');
    }
  }

  private async initBucket() {
    if (!this.client) return;
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Created bucket: ${this.bucketName}`);
      }
    } catch (err) {
      this.logger.warn(`Could not verify S3 bucket ${this.bucketName}: ${err}`);
    }
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    subfolder = 'questions',
  ): Promise<UploadResult> {
    if (!this.client) {
      throw new Error('S3 client is not configured.');
    }

    const objectName = `${subfolder}/${filename}`;
    await this.client.putObject(this.bucketName, objectName, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    const url = this.publicUrl
      ? `${this.publicUrl}/${objectName}`
      : `/${this.bucketName}/${objectName}`;

    return {
      url,
      filename,
      size: buffer.length,
      mimeType,
    };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.client) return;
    try {
      const parts = fileUrl.split(`${this.bucketName}/`);
      if (parts[1]) {
        await this.client.removeObject(this.bucketName, parts[1]);
      }
    } catch (err) {
      this.logger.warn(`Failed to delete S3 object: ${err}`);
    }
  }
}
