import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { AddEmployeeDto } from 'src/dto/add-employee.dto';
import { AuthGuard } from 'src/guard/auth.guard';

@Controller('employee')
@UseGuards(AuthGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}
  @Post('')
  async addEmployee(@Req() request, @Body() addEmployeeDto: AddEmployeeDto) {
    return this.employeeService.addEmployee(request.orgId, addEmployeeDto);
  }

  @Get('')
  async getAllEmployees(@Req() req) {
    return this.employeeService.getAllEmployees(req.orgId);
  }
}
