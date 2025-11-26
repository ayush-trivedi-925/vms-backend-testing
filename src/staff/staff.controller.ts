import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { AddStaffMemberDto } from 'src/dto/add-staff-member.dto';
import { AuthGuard } from 'src/guard/auth.guard';
import { EditStaffMemberDto } from 'src/dto/edit-staff-member.dto';

@UseGuards(AuthGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}
  @Post('')
  async addStaffMember(
    @Req() req,
    @Query('qOrgId') qOrgId: string,
    @Body() addStaffMemberDto: AddStaffMemberDto,
  ) {
    return this.staffService.addStaffMember(
      req.orgId ?? null,
      req.role,
      addStaffMemberDto,
      qOrgId ?? null,
    );
  }

  @Post('bulk')
  async addStaffBulk(
    @Req() req,
    @Body() addStaff: AddStaffMemberDto[],
    @Query('qOrgId') qOrgId: string,
  ) {
    if (!Array.isArray(addStaff) || addStaff.length === 0) {
      throw new BadRequestException('Staff list must be a non-empty array.');
    }
    return this.staffService.addStaffBulk(
      req.orgId ?? null,
      req.role,
      addStaff,
      qOrgId ?? null,
    );
  }

  @Get('superadmin')
  async getSuperAdminDetails(@Req() req, @Query('qOrgId') qOrgId?: string) {
    console.log(req.orgId, req.role, req.userId);
    return this.staffService.getSuperAdminDetails(
      req.orgId,
      req.role,
      req.userId,
      qOrgId,
    );
  }

  @Get('')
  async getAllStaffMemberDetails(@Req() req, @Query('qOrgId') qOrgId?: string) {
    return this.staffService.getAllStaffMemberDetails(
      req.orgId ?? null,
      req.role,
      qOrgId,
    );
  }

  @Get('user')
  async getStaffMemberDetailsUserId(@Req() req) {
    return this.staffService.getStaffMemberDetailsUserId(
      req.orgId,
      req.role,
      req.userId,
    );
  }

  @Get(':staffId')
  async getStaffMemberDetails(
    @Req() req,
    @Param('staffId') staffId: string,
    @Query('qOrgId') qOrgId?: string,
  ) {
    return this.staffService.getStaffMemberDetails(
      req.orgId ?? null,
      req.role,
      staffId,
      req.userId,
      qOrgId,
    );
  }

  @Put(':staffId')
  async updateStaffMember(
    @Req() req,
    @Param('staffId') staffId: string,
    @Body() editStaffMemberDto: EditStaffMemberDto,
    @Query('qOrgId') qOrgId?: string,
  ) {
    return this.staffService.editStaffMemberDetails(
      req.orgId,
      req.role,
      staffId,
      editStaffMemberDto,
      qOrgId,
    );
  }

  @Delete(':staffId')
  async deleteStaffMember(
    @Req() req,
    @Param('staffId') staffId: string,
    @Query('qOrgId') qOrgId?: string,
  ) {
    return this.staffService.deleteStaffMember(
      req.orgId ?? null,
      req.role,
      staffId,
      qOrgId,
    );
  }
}
