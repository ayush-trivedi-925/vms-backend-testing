import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../service/mail/mail.module';
import { MediaModule } from '../media/media.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, MailModule, MediaModule, ConfigModule],
  providers: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
