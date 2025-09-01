import { Module } from '@nestjs/common';
import { StaffMemberService } from './staff-member.service';
import { StaffMemberController } from './staff-member.controller';

@Module({
  providers: [StaffMemberService],
  controllers: [StaffMemberController]
})
export class StaffMemberModule {}
