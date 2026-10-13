import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsInput, updateSettingsSchema, SocketEvent } from '@secure-cbt/shared';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';
import { v4 as uuidv4 } from 'uuid';

const SETTINGS_ID = 'global';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async get() {
    return this.prisma.setting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  async update(dto: UpdateSettingsInput) {
    const data = updateSettingsSchema.parse(dto);
    const settings = await this.prisma.setting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });

    this.eventEmitter.emit(SocketEvent.SETTINGS_UPDATED, { settings });
    return settings;
  }

  async uploadMasterTemplate(
    file: Express.Multer.File,
    type: 'word' | 'excel',
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('File template wajib diunggah');
    }

    const filenameLower = file.originalname.toLowerCase();
    const ext = type === 'word' ? 'docx' : 'xlsx';

    if (type === 'word' && !filenameLower.endsWith('.docx')) {
      throw new BadRequestException('Format template Word harus berakhiran .docx');
    }
    if (type === 'excel' && !filenameLower.endsWith('.xlsx')) {
      throw new BadRequestException('Format template Excel harus berakhiran .xlsx');
    }

    const storedFilename = `master-template-${type}-${uuidv4()}.${ext}`;
    const mimeType =
      type === 'word'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const uploadResult = await this.storageService.uploadFile(
      file.buffer,
      storedFilename,
      mimeType,
      'templates',
    );

    const updateData =
      type === 'word'
        ? { template_docx_url: uploadResult.url }
        : { template_xlsx_url: uploadResult.url };

    return this.update(updateData as any);
  }

  async resetMasterTemplate(type: 'word' | 'excel') {
    const current = await this.get();
    const existingUrl =
      type === 'word' ? current.template_docx_url : current.template_xlsx_url;

    if (existingUrl) {
      await this.storageService.deleteFile(existingUrl);
    }

    const updateData =
      type === 'word'
        ? { template_docx_url: null }
        : { template_xlsx_url: null };

    return this.update(updateData as any);
  }
}
