import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringGateway } from './monitoring.gateway';
import { MonitoringListener } from './monitoring.listener';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringGateway, MonitoringListener],
  exports: [MonitoringService, MonitoringGateway],
})
export class MonitoringModule {}
