import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateMeetingDto } from 'src/dto/create-meeting.dto';
import { MeetingService } from './meeting.service';
import { EndMeetingDto } from 'src/dto/end-meeting.dto';

@Controller('meeting')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}
  @Post('check-in')
  async createMeeting(@Body() createMeetingDto: CreateMeetingDto) {
    return this.meetingService.creatMeeting(createMeetingDto);
  }

  @Post('check-out')
  async endMeeting(@Body() endMeetingDto: EndMeetingDto) {
    return this.meetingService.endMeeting(endMeetingDto);
  }
  @Get('complete')
  async getAllCompletedMeetings() {
    return this.meetingService.completedMeetings();
  }

  @Get('on-going')
  async getAllOnGoingMeetings() {
    return this.meetingService.onGoingMeetings();
  }
}
