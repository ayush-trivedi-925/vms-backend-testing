import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsGateway],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
