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
    return this.meetingService.creatMeeting(req.orgId, createMeetingDto);
  }

  @Post('check-out')
  async endMeeting(@Body() endMeetingDto: EndMeetingDto) {
    return this.meetingService.endMeeting(endMeetingDto);
  }
  @Get('complete')
  async getAllCompletedMeetings(@Req() req) {
    return this.meetingService.completedMeetings(req.orgId);
  }

  @Get('on-going')
  async getAllOnGoingMeetings(@Req() req) {
    return this.meetingService.onGoingMeetings(req.orgId);
  }
}
