import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsInput, updateSettingsSchema, SocketEvent } from '@secure-cbt/shared';
import { EventEmitter2 } from '@nestjs/event-emitter';

const SETTINGS_ID = 'global';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
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
}
