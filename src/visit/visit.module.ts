import { Module } from '@nestjs/common';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/service/mail/mail.module';

@Module({
  imports: [DatabaseModule, MailModule],
  providers: [VisitService],
  controllers: [VisitController],
})
export class VisitModule {}
