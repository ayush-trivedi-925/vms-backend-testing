import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { VisitService } from './visit.service';
import { StartVisitDto } from 'src/dto/start-visit.dto';
import { EndVisitDto } from 'src/dto/end-visit.dto';

@Controller('visit')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}
  @Post('check-in')
  async startVisit(@Req() req, @Body() startVisitDto: StartVisitDto) {
    return this.visitService.startVisit(req.orgId, req.userId, startVisitDto);
  }

  @Post('check-out')
  async endVisit(@Req() req, @Body() endVisitDto: EndVisitDto) {
    return this.visitService.endVisit(req.orgId, req.userId, endVisitDto);
  }

  @Get('ongoing')
  async allOnGoingVisits(@Req() req) {
    return this.visitService.allOnGoingVisits(req.orgId, req.role);
  }

  @Get('completed')
  async allCompletedVisits(@Req() req) {
    return this.visitService.allCompletedVisits(req.orgId, req.role);
  }
}
