import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/service/mail/mail.module';

@Module({
  imports: [DatabaseModule, MailModule],
  providers: [SystemService],
  controllers: [SystemController],
})
export class SystemModule {}
