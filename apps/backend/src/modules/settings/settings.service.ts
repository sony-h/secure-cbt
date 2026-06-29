import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsInput, updateSettingsSchema, SocketEvent } from '@secure-cbt/shared';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async get() {
    let settings = await this.prisma.setting.findFirst();
    if (!settings) {
      settings = await this.prisma.setting.create({ data: {} });
    }
    return settings;
  }

  async update(dto: UpdateSettingsInput) {
    const data = updateSettingsSchema.parse(dto);
    let settings = await this.prisma.setting.findFirst();

    if (!settings) {
      settings = await this.prisma.setting.create({ data });
    } else {
      settings = await this.prisma.setting.update({
        where: { id: settings.id },
        data,
      });
    }

    this.eventEmitter.emit(SocketEvent.SETTINGS_UPDATED, { settings });
    return settings;
  }
}
