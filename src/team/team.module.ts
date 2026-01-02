import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/service/mail/mail.module';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';

@Module({
  imports: [DatabaseModule, MailModule],
  providers: [TeamService],
  controllers: [TeamController],
})
export class TeamModule {}
