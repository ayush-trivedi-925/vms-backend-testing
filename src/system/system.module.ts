import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/service/mail/mail.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, MailModule, ConfigModule],
  providers: [SystemService],
  controllers: [SystemController],
})
export class SystemModule {}
