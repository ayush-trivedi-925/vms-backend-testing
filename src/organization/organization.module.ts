import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/service/mail/mail.module';

@Module({
  imports: [DatabaseModule, MailModule],
  providers: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
