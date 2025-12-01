import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/service/mail/mail.module';
import { MediaModule } from 'src/media/media.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [DatabaseModule, MailModule, MediaModule, ConfigModule],
  providers: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
