// ../attendance/attendance.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ScanAttendanceDto, AttendanceActionDto } from '../dto/attendance.dto';
import { AuthGuard } from '../guard/auth.guard';
import { Response } from 'express';

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

  // AttendanceController
  @Get('export')
  async export(
    @Req() req,
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    const buf = await this.attendanceService.exportAttendanceRangeExcel(
      req.orgId,
      req.role,
      start,
      end,
    );
    const filename = `attendance-${start}-${end}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buf);
  }
}
