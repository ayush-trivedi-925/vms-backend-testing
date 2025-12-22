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
import { AuthGuard } from 'src/guard/auth.guard';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from 'src/dto/create-department.dto';

@UseGuards(AuthGuard)
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}
  @Post('')
  async CreateDepartment(
    @Req() req,
    @Body() createDepartmentDto: CreateDepartmentDto,
    @Query('qOrgId') qOrgId?: string,
  ) {
    return this.departmentService.createDepartment(
      req.orgId,
      req.userId,
      req.role,
      createDepartmentDto,
      qOrgId ?? null,
    );
  }

  @Post('bulk')
  async addReasonBulk(
    @Req() req,
    @Body() departmentList: CreateDepartmentDto[],
    @Query('qOrgId') qOrgId?: string,
  ) {
    if (!Array.isArray(departmentList) || departmentList.length === 0) {
      throw new BadRequestException('Staff list must be a non-empty array.');
    }
    return this.departmentService.addDepartmentBulk(
      req.orgId ?? null,
      req.role,
      departmentList,
      qOrgId ?? null,
    );
  }

  @Get('')
  async getAllDepartments(
    @Req() req,
    @Query('sortBy') sortBy?: string,
    @Query('order') order: 'asc' | 'desc' = 'desc',
    @Query('qOrgId') qOrgId?: string,
  ) {
    return this.departmentService.getAllDepartments(
      req.orgId,
      req.userId,
      req.role,
      sortBy,
      order,
      qOrgId ?? null,
    );
  }

  @Delete(':departmentId')
  async deleteDepartment(
    @Req() req,
    @Param('departmentId') departmentId: string,
    @Query('qOrgId') qOrgId?: string,
  ) {
    return this.departmentService.deleteDepartment(
      req.orgId,
      req.userId,
      req.role,
      departmentId,
      qOrgId ?? null,
    );
  }
}
