// src/attendance/attendance.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ScanAttendanceDto, AttendanceActionDto } from '../dto/attendance.dto';
import { AuthGuard } from 'src/guard/auth.guard';
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

  // @Get('/:staffId/last-month')
  // async downloadLastMonthAttendance(
  //   @Res() res: Response,
  //   @Req() req: any,
  //   @Param('staffId') staffId: string,
  // ) {
  //   const { workbook, employeeCode } =
  //     await this.attendanceService.exportLastMonthAttendance(
  //       req.orgId,
  //       req.userId,
  //       req.role,
  //       staffId,
  //     );

  //   const monthLabel = new Date().toLocaleString('default', {
  //     month: 'short',
  //     year: 'numeric',
  //   });

  //   const fileName = `${employeeCode}_Attendance_${monthLabel}.xlsx`;

  //   res.setHeader(
  //     'Content-Type',
  //     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //   );

  //   res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  //   res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  //   await workbook.xlsx.write(res);
  //   res.end();
  // }
}
