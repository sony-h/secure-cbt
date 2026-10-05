import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from '../local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let config: ConfigService;
  const testDir = path.join(process.cwd(), 'storage', 'uploads', 'test_questions');

  beforeEach(() => {
    config = new ConfigService({
      API_URL: 'https://api.example.com',
    });
    service = new LocalStorageService(config);
  });

  afterEach(async () => {
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  it('should upload and persist buffer to disk and return URL', async () => {
    const buffer = Buffer.from('fake image content');
    const filename = 'test-image.webp';
    const result = await service.uploadFile(buffer, filename, 'image/webp', 'test_questions');

    expect(result.filename).toBe(filename);
    expect(result.size).toBe(buffer.length);
    expect(result.mimeType).toBe('image/webp');
    expect(result.url).toBe('https://api.example.com/uploads/test_questions/test-image.webp');

    const written = await fs.promises.readFile(path.join(testDir, filename));
    expect(written.toString()).toBe('fake image content');
  });

  it('should delete file if present', async () => {
    const buffer = Buffer.from('to be deleted');
    const filename = 'delete-me.webp';
    const result = await service.uploadFile(buffer, filename, 'image/webp', 'test_questions');

    expect(fs.existsSync(path.join(testDir, filename))).toBe(true);

    await service.deleteFile(result.url);
    expect(fs.existsSync(path.join(testDir, filename))).toBe(false);
  });
});
