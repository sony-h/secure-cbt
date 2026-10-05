import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole } from '@secure-cbt/shared';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Post('image')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Upload and optimize question/option image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File gambar wajib diunggah');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format gambar tidak didukung. Harap gunakan format JPG, PNG, WebP, GIF, atau SVG.',
      );
    }

    let bufferToUpload = file.buffer;
    let extension = 'webp';
    let mimeType = 'image/webp';
    let width: number | undefined;
    let height: number | undefined;

    if (file.mimetype === 'image/svg+xml') {
      extension = 'svg';
      mimeType = 'image/svg+xml';
    } else if (file.mimetype === 'image/gif') {
      extension = 'gif';
      mimeType = 'image/gif';
    } else {
      try {
        const image = sharp(file.buffer);
        const metadata = await image.metadata();

        const pipeline = image.resize({
          width: 1600,
          withoutEnlargement: true,
          fit: 'inside',
        });

        bufferToUpload = await pipeline.webp({ quality: 80 }).toBuffer();
        const optimizedMetadata = await sharp(bufferToUpload).metadata();
        width = optimizedMetadata.width;
        height = optimizedMetadata.height;
      } catch (err) {
        throw new BadRequestException('Gagal memproses file gambar. Pastikan file valid.');
      }
    }

    const filename = `${uuidv4()}.${extension}`;
    const result = await this.storageService.uploadFile(
      bufferToUpload,
      filename,
      mimeType,
      'questions',
    );

    return {
      success: true,
      message: 'Gambar berhasil diunggah',
      data: {
        ...result,
        width,
        height,
      },
    };
  }
}
