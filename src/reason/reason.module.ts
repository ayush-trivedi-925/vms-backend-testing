import { Module } from '@nestjs/common';
import { ReasonController } from './reason.controller';
import { ReasonService } from './reason.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ReasonController],
  providers: [ReasonService],
})
export class ReasonModule {}
