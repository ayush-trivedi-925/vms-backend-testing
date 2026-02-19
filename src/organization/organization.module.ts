import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../service/mail/mail.module';

import { ConfigModule } from '@nestjs/config';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [DatabaseModule, MailModule, ConfigModule, S3Module],
  providers: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
