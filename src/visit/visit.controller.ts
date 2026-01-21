import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { VisitService } from './visit.service';
import { StartVisitDto } from 'src/dto/start-visit.dto';
import { EndVisitDto } from 'src/dto/end-visit.dto';
import { AuthGuard } from 'src/guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/service/multer/multer.config';
import { VisitAnalyticsService } from './visit.analytics.service';

@UseGuards(AuthGuard)
@Controller('visit')
export class VisitController {
  constructor(
    private readonly visitService: VisitService,
    private readonly visitAnalyticsService: VisitAnalyticsService,
  ) {}

  @Get('ongoing')
  async allOnGoingVisits(@Req() req) {
    return this.visitService.allOnGoingVisits(req.orgId, req.role);
  }

  @Get('completed')
  async allCompletedVisits(@Req() req) {
    return this.visitService.allCompletedVisits(req.orgId, req.role);
  }

  @Get('visitors-per-department')
  async getVisitorsPerDepartment(@Req() req) {
    return this.visitService.getVisitorsPerDepartment(req.orgId);
  }

  @Get('export')
  async exportExcel(
    @Req() req,
    @Res() res,
    @Query('filter') filter: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const orgId = req.orgId;
    const role = req.role;

    const excelBuffer = await this.visitService.exportCompletedVisits(
      orgId,
      role,
      filter as any,
      startDate,
      endDate,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="completed_visits.xlsx"`,
    );

    res.send(excelBuffer);
  }

  // ---------------------------------------------

  @Get('staff/:staffId/completed')
  async allCompletedVisitsStaff(@Req() req, @Param('staffId') staffId: string) {
    return this.visitService.allCompletedVisitsStaff(
      req.orgId,
      req.role,
      staffId,
    );
  }

  @Get('staff/:staffId/ongoing')
  async allOnGoingVisitsStaff(@Req() req, @Param('staffId') staffId: string) {
    return this.visitService.allOnGoingVisitsStaff(
      req.orgId,
      req.role,
      staffId,
    );
  }

  @UseInterceptors(FileInterceptor('checkInPicture', multerConfig))
  @Post('check-in')
  async startVisit(
    @Req() req,
    @Body() startVisitDto: StartVisitDto,
    @UploadedFile() checkInPicture?: Express.Multer.File,
  ) {
    return this.visitService.startVisit(
      req.orgId,
      req.systemId,
      startVisitDto,
      checkInPicture ?? undefined,
    );
  }

  @Post('check-out')
  async endVisit(@Req() req, @Body() endVisitDto: EndVisitDto) {
    return this.visitService.endVisit(
      req.orgId,
      endVisitDto,
      req.systemId ?? null,
      req.role ?? null,
    );
  }

  @Post('check-status')
  async checkMeetingStatus(
    @Req() req,
    @Body()
    data: {
      email: string;
    },
  ) {
    return this.visitService.checkMeetingStatus(
      req.systemId,
      req.role,
      req.orgId,
      data.email,
    );
  }

  @Post('resend-notification/:visitId')
  async resendNotification(@Req() req, @Param('visitId') visitId: string) {
    return this.visitService.resendVisitNotification(
      req.systemId,
      req.role,
      req.orgId,
      visitId,
    );
  }

  @UseInterceptors(FileInterceptor('checkOutPicture', multerConfig))
  @Post('check-out-qr/:visitId')
  async checkoutQr(
    @Req() req,
    @Param('visitId') visitId: string,
    @UploadedFile() checkOutPicture?: Express.Multer.File,
  ) {
    return this.visitService.endVisitQr(
      req.orgId,
      req.role,
      visitId,
      checkOutPicture ?? undefined,
    );
  }

  @Get('analytics/:orgId/summary')
  getSummary(
    @Param('orgId') orgId: string,
    @Query('period') period: 'day' | 'week' | 'month' | 'year' | 'all' = 'all',
  ) {
    return this.visitAnalyticsService.getVisitStats(orgId, period);
  }

  @Get('analytics/:orgId/top-employees')
  getTopEmployees(@Param('orgId') orgId: string, @Query('period') period: any) {
    return this.visitAnalyticsService.getTopEmployees(orgId, period);
  }

  @Get('analytics/:orgId/top-visitors')
  getTopVisitors(@Param('orgId') orgId: string, @Query('period') period: any) {
    return this.visitAnalyticsService.getTopVisitors(orgId, period);
  }

  @Get('analytics/:orgId/top-departments')
  getTopDepartments(
    @Param('orgId') orgId: string,
    @Query('period') period: any,
  ) {
    return this.visitAnalyticsService.getTopDepartments(orgId, period);
  }

  @Get('analytics/:orgId/top-reasons')
  getTopReasons(@Param('orgId') orgId: string, @Query('period') period: any) {
    return this.visitAnalyticsService.getTopReasons(orgId, period);
  }

  @Get('details/:visitId')
  async getVisitDetails(@Req() req, @Param('visitId') visitId: string) {
    return this.visitService.getVisitDetails(req.orgId, req.role, visitId);
  }

  @Patch(':visitId/accept')
  async acceptVisit(@Req() req, @Param('visitId') visitId: string) {
    return this.visitService.acceptVisit(
      req.orgId,
      req.userId,
      req.role,
      visitId,
    );
  }

  @Patch(':visitId/reject')
  async rejectVisit(@Req() req, @Param('visitId') visitId: string) {
    return this.visitService.rejectVisit(
      req.orgId,
      req.userId,
      req.role,
      visitId,
    );
  }
}
