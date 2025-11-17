import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/service/mail/mail.module';

@Module({
  imports: [DatabaseModule, MailModule],
  providers: [StaffService],
  controllers: [StaffController],
})
export class StaffModule {}
