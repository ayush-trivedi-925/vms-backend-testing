import { Module } from '@nestjs/common';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/service/mail/mail.module';

import { VisitAnalyticsService } from './visit.analytics.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [DatabaseModule, MailModule, S3Module, NotificationsModule],
  providers: [VisitService, VisitAnalyticsService],
  controllers: [VisitController],
})
export class VisitModule {}
