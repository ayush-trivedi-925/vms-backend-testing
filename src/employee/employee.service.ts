import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { AddEmployeeDto } from 'src/dto/add-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly databaseService: DatabaseService) {}

  async addEmployee(orgId, addEmployeeDto: AddEmployeeDto) {
    const { employeeName, employeeEmail, designation, department } =
      addEmployeeDto;
    const orgExists = await this.databaseService.organization.findUnique({
      where: {
        id: orgId,
      },
    });
    if (!orgExists) {
      throw new BadRequestException("Organization doesn't exists");
    }
    const employeeExists = await this.databaseService.employee.findUnique({
      where: {
        employeeEmail,
      },
    });

    if (employeeExists) {
      throw new BadRequestException('Employee already exists.');
    }

    const normalizedEmail = employeeEmail.trim().toLowerCase();
    const employee = await this.databaseService.employee.create({
      data: {
        employeeEmail: normalizedEmail,
        employeeName,
        designation,
        department,
        orgId,
      },
    });
    return {
      Success: true,
      Message: 'Employee added successfully.',
      EmployeeDetails: employee,
    };
  }
}
