import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { UploadsController } from '../uploads.controller';
import { IStorageService } from '../../storage/storage.interface';

describe('UploadsController', () => {
  let controller: UploadsController;
  let mockStorageService: IStorageService;

  beforeEach(() => {
    mockStorageService = {
      uploadFile: vi.fn().mockImplementation((buffer, filename, mimeType, subfolder) =>
        Promise.resolve({
          url: `http://localhost:3000/uploads/${subfolder}/${filename}`,
          filename,
          size: buffer.length,
          mimeType,
        }),
      ),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };

    controller = new UploadsController(mockStorageService);
  });

  describe('uploadAudio', () => {
    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(controller.uploadAudio(undefined)).rejects.toThrow(BadRequestException);
      await expect(controller.uploadAudio(undefined)).rejects.toThrow('File audio wajib diunggah');
    });

    it('should throw BadRequestException for unsupported mime types', async () => {
      const invalidFile = {
        fieldname: 'file',
        originalname: 'video.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from('fake-video-content'),
        size: 100,
      } as Express.Multer.File;

      await expect(controller.uploadAudio(invalidFile)).rejects.toThrow(BadRequestException);
      await expect(controller.uploadAudio(invalidFile)).rejects.toThrow(
        'Format audio tidak didukung. Harap gunakan format MP3, WAV, M4A, AAC, OGG, atau WebM.',
      );
    });

    it('should successfully upload an MP3 audio file to questions/audio subfolder', async () => {
      const audioFile = {
        fieldname: 'file',
        originalname: 'listening-section-1.mp3',
        encoding: '7bit',
        mimetype: 'audio/mpeg',
        buffer: Buffer.from('fake-audio-mp3-bytes'),
        size: 20,
      } as Express.Multer.File;

      const result = await controller.uploadAudio(audioFile);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Audio berhasil diunggah');
      expect(result.data.mimeType).toBe('audio/mpeg');
      expect(result.data.filename).toMatch(/\.mp3$/);
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        audioFile.buffer,
        expect.stringMatching(/^[0-9a-f-]{36}\.mp3$/),
        'audio/mpeg',
        'questions/audio',
      );
    });

    it('should correctly map audio extensions for WAV, M4A, AAC, OGG, and WebM', async () => {
      const audioTypes = [
        { mime: 'audio/wav', ext: 'wav' },
        { mime: 'audio/x-wav', ext: 'wav' },
        { mime: 'audio/m4a', ext: 'm4a' },
        { mime: 'audio/x-m4a', ext: 'm4a' },
        { mime: 'audio/aac', ext: 'aac' },
        { mime: 'audio/ogg', ext: 'ogg' },
        { mime: 'audio/webm', ext: 'webm' },
      ];

      for (const { mime, ext } of audioTypes) {
        const file = {
          fieldname: 'file',
          originalname: `test.${ext}`,
          encoding: '7bit',
          mimetype: mime,
          buffer: Buffer.from('audio-data'),
          size: 10,
        } as Express.Multer.File;

        const res = await controller.uploadAudio(file);
        expect(res.success).toBe(true);
        expect(res.data.filename).toMatch(new RegExp(`\\.${ext}$`));
        expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
          file.buffer,
          expect.stringMatching(new RegExp(`\\.${ext}$`)),
          mime,
          'questions/audio',
        );
      }
    });
  });

  describe('uploadImage', () => {
    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(controller.uploadImage(undefined)).rejects.toThrow(BadRequestException);
      await expect(controller.uploadImage(undefined)).rejects.toThrow('File gambar wajib diunggah');
    });

    it('should throw BadRequestException for unsupported mime types', async () => {
      const invalidFile = {
        fieldname: 'file',
        originalname: 'doc.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('fake-pdf'),
        size: 100,
      } as Express.Multer.File;

      await expect(controller.uploadImage(invalidFile)).rejects.toThrow(BadRequestException);
    });

    it('should successfully upload SVG file directly', async () => {
      const svgFile = {
        fieldname: 'file',
        originalname: 'icon.svg',
        encoding: '7bit',
        mimetype: 'image/svg+xml',
        buffer: Buffer.from('<svg></svg>'),
        size: 13,
      } as Express.Multer.File;

      const result = await controller.uploadImage(svgFile);

      expect(result.success).toBe(true);
      expect(result.data.filename).toMatch(/\.svg$/);
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        svgFile.buffer,
        expect.stringMatching(/\.svg$/),
        'image/svg+xml',
        'questions',
      );
    });
  });
});
