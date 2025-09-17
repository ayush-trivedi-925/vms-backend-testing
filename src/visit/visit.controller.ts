import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
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

@UseGuards(AuthGuard)
@Controller('visit')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}
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

  @Get('ongoing')
  async allOnGoingVisits(@Req() req) {
    return this.visitService.allOnGoingVisits(req.orgId, req.role);
  }

  @Get('completed')
  async allCompletedVisits(@Req() req) {
    return this.visitService.allCompletedVisits(req.orgId, req.role);
  }
}
