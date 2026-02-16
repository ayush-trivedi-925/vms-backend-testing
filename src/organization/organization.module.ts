import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/service/mail/mail.module';

import { ConfigModule } from '@nestjs/config';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [DatabaseModule, MailModule, ConfigModule, S3Module],
  providers: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
