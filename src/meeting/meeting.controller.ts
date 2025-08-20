import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CreateMeetingDto } from 'src/dto/create-meeting.dto';
import { MeetingService } from './meeting.service';
import { EndMeetingDto } from 'src/dto/end-meeting.dto';
import { AuthGuard } from 'src/guard/auth.guard';

@Controller('meeting')
@UseGuards(AuthGuard)
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}
  @Post('check-in')
  async createMeeting(@Req() req, @Body() createMeetingDto: CreateMeetingDto) {
    return this.meetingService.creatMeeting(
      req.orgId,
      req.role,
      createMeetingDto,
    );
  }

  @Post('check-out')
  async endMeeting(@Req() req, @Body() endMeetingDto: EndMeetingDto) {
    return this.meetingService.endMeeting(req.role, endMeetingDto);
  }
  @Get('complete')
  async getAllCompletedMeetings(@Req() req) {
    return this.meetingService.completedMeetings(req.orgId, req.role);
  }

  @Get('on-going')
  async getAllOnGoingMeetings(@Req() req) {
    return this.meetingService.onGoingMeetings(req.orgId, req.role);
  }
}
