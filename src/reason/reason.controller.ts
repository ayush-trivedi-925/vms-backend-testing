import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReasonService } from './reason.service';
import { AddReasonDto } from 'src/dto/add-reason.dto';
import { AuthGuard } from 'src/guard/auth.guard';
@UseGuards(AuthGuard)
@Controller('reason')
export class ReasonController {
  constructor(private readonly reasonService: ReasonService) {}

  @Post('')
  async addReason(
    @Req() req,
    @Body() addReasonDto: AddReasonDto,
    @Query('qOrgId') qOrgId?,
  ) {
    return this.reasonService.addReason(
      req.orgId,
      req.userId,
      req.role,
      addReasonDto,
      qOrgId ?? null,
    );
  }

  @Post('bulk')
  async addReasonBulk(
    @Req() req,
    @Body() reasonList: AddReasonDto[],
    @Query('qOrgId') qOrgId: string,
  ) {
    if (!Array.isArray(reasonList) || reasonList.length === 0) {
      throw new BadRequestException('Staff list must be a non-empty array.');
    }
    return this.reasonService.addReasonBulk(
      req.orgId ?? null,
      req.role,
      reasonList,
      qOrgId ?? null,
    );
  }

  @Get('')
  async getAllDepartments(@Req() req, @Query('qOrgId') qOrgId?: string) {
    return this.reasonService.getAllReasons(
      req.orgId ?? null,
      req.role,
      qOrgId,
    );
  }

  @Delete(':reasonId')
  async deleteReason(
    @Req() req,
    @Param('reasonId') reasonId: string,
    @Query('qOrgId') qOrgId?: string,
  ) {
    return this.reasonService.deleteReason(
      req.orgId,
      req.userId,
      req.role,
      reasonId,
      qOrgId ?? null,
    );
  }
}
