// src/attendance/attendance.controller.ts
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ScanAttendanceDto, AttendanceActionDto } from '../dto/attendance.dto';
import { AuthGuard } from 'src/guard/auth.guard';

@UseGuards(AuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('scan')
  scan(@Req() req, @Body() dto: ScanAttendanceDto) {
    return this.attendanceService.scan(req.orgId, req.systemId, req.role, dto);
  }

  @Post('action')
  action(@Req() req, @Body() dto: AttendanceActionDto) {
    return this.attendanceService.action(
      req.orgId,
      req.systemId,
      req.role,
      dto,
    );
  }
}
