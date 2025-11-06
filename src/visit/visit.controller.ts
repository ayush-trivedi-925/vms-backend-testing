import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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

  @UseInterceptors(FileInterceptor('checkOutPicture', multerConfig))
  @Post('check-out')
  async endVisit(
    @Req() req,
    @Body() endVisitDto: EndVisitDto,
    @UploadedFile() checkOutPicture?: Express.Multer.File,
  ) {
    console.log('Checkout body:', {
      orgId: req.orgId,
      endVisitDto,
      systemId: req.systemId ?? null,
      role: req.role ?? null,
    });
    console.log('Checkout file:', checkOutPicture);
    return this.visitService.endVisit(
      req.orgId,
      endVisitDto,
      req.systemId ?? null,
      req.role ?? null,
      checkOutPicture ?? undefined,
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

  @Get('ongoing')
  async allOnGoingVisits(@Req() req) {
    return this.visitService.allOnGoingVisits(req.orgId, req.role);
  }

  @Get('completed')
  async allCompletedVisits(@Req() req) {
    return this.visitService.allCompletedVisits(req.orgId, req.role);
  }

  // visit.controller.ts
  @Get('visitors-per-department')
  async getVisitorsPerDepartment(@Req() req) {
    return this.visitService.getVisitorsPerDepartment(req.orgId);
  }

  @Get(':orgId/summary')
  getSummary(
    @Param('orgId') orgId: string,
    @Query('period') period: 'day' | 'week' | 'month' | 'year' | 'all' = 'all',
  ) {
    return this.visitAnalyticsService.getVisitStats(orgId, period);
  }

  @Get(':orgId/top-employees')
  getTopEmployees(@Param('orgId') orgId: string, @Query('period') period: any) {
    return this.visitAnalyticsService.getTopEmployees(orgId, period);
  }

  @Get(':orgId/top-visitors')
  getTopVisitors(@Param('orgId') orgId: string, @Query('period') period: any) {
    return this.visitAnalyticsService.getTopVisitors(orgId, period);
  }

  @Get(':orgId/top-departments')
  getTopDepartments(
    @Param('orgId') orgId: string,
    @Query('period') period: any,
  ) {
    return this.visitAnalyticsService.getTopDepartments(orgId, period);
  }

  @Get(':orgId/top-reasons')
  getTopReasons(@Param('orgId') orgId: string, @Query('period') period: any) {
    return this.visitAnalyticsService.getTopReasons(orgId, period);
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

  @Get(':visitId')
  async getVisitDetails(@Req() req, @Param('visitId') visitId: string) {
    return this.visitService.getOnGoingVisitDetails(
      req.orgId,
      req.role,
      visitId,
    );
  }
}
