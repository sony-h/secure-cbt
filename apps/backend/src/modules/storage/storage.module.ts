import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { STORAGE_SERVICE } from './storage.interface';

@Global()
@Module({
  providers: [
    LocalStorageService,
    S3StorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService, local: LocalStorageService, s3: S3StorageService) => {
        const driver = (config.get<string>('STORAGE_DRIVER') || 'local').toLowerCase();
        if (driver === 's3') {
          return s3;
        }
        return local;
      },
      inject: [ConfigService, LocalStorageService, S3StorageService],
    },
  ],
  exports: [STORAGE_SERVICE, LocalStorageService, S3StorageService],
})
export class StorageModule {}
