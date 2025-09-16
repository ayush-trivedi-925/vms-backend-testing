import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VisitService } from './visit.service';
import { StartVisitDto } from 'src/dto/start-visit.dto';
import { EndVisitDto } from 'src/dto/end-visit.dto';
import { AuthGuard } from 'src/guard/auth.guard';

@UseGuards(AuthGuard)
@Controller('visit')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}
  @Post('check-in')
  async startVisit(@Req() req, @Body() startVisitDto: StartVisitDto) {
    return this.visitService.startVisit(req.orgId, req.systemId, startVisitDto);
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

  @Get('ongoing')
  async allOnGoingVisits(@Req() req) {
    return this.visitService.allOnGoingVisits(req.orgId, req.role);
  }

  @Get('completed')
  async allCompletedVisits(@Req() req) {
    return this.visitService.allCompletedVisits(req.orgId, req.role);
  }
}
