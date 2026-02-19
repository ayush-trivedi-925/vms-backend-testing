import { Module } from '@nestjs/common';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../service/mail/mail.module';

import { VisitAnalyticsService } from './visit.analytics.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [DatabaseModule, MailModule, S3Module, NotificationsModule],
  providers: [VisitService, VisitAnalyticsService],
  controllers: [VisitController],
})
export class VisitModule {}
