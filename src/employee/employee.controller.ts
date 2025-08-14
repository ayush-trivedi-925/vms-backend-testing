import { Body, Controller, Post, Req } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { AddEmployeeDto } from 'src/dto/add-employee.dto';

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}
  @Post()
  async addEmployee(@Req() request, @Body() addEmployeeDto: AddEmployeeDto) {
    return this.employeeService.addEmployee(request.orgId, addEmployeeDto);
  }
}
