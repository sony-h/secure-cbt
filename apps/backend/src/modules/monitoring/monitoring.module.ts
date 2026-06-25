import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringGateway } from './monitoring.gateway';
import { MonitoringListener } from './monitoring.listener';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringGateway, MonitoringListener],
  exports: [MonitoringService, MonitoringGateway],
})
export class MonitoringModule {}
