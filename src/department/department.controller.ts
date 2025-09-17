import {
  Body,
  Controller,
  Get,
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

  @Get('')
  async getAllDepartments(@Req() req, @Query('qOrgId') qOrgId?: string) {
    return this.departmentService.getAllDepartments(
      req.orgId,
      req.userId,
      req.role,
      qOrgId ?? null,
    );
  }
}
