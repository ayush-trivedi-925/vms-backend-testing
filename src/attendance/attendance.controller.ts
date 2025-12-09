// src/attendance/attendance.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ScanAttendanceDto, AttendanceActionDto } from '../dto/attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('scan')
  scan(@Body() dto: ScanAttendanceDto) {
    return this.attendanceService.scan(dto);
  }

  @Post('action')
  action(@Body() dto: AttendanceActionDto) {
    return this.attendanceService.action(dto);
  }
}
