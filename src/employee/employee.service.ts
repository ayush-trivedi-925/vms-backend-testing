import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { AddEmployeeDto } from 'src/dto/add-employee.dto';
import { UpdateEmployeeDetailsDto } from 'src/dto/update-employee-details.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly databaseService: DatabaseService) {}

  async addEmployee(orgId, role, addEmployeeDto: AddEmployeeDto) {
    const { employeeName, employeeEmail, designation, department } =
      addEmployeeDto;
    if (role === 'SuperAdmin' || 'Admin' || 'Root') {
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
    } else {
      throw new UnauthorizedException(
        "This role doesn't have permission to access this end-point.",
      );
    }
  }

  async getAllEmployees(orgId: string) {
    const orgExists = await this.databaseService.organization.findUnique({
      where: {
        id: orgId,
      },
    });

    if (!orgExists) {
      throw new NotFoundException("Organization doesn't exists.");
    }

    const employees = await this.databaseService.employee.findMany({
      where: {
        orgId,
      },
    });

    if (!employees.length) {
      return {
        Success: true,
        Message: 'No employees exist.',
      };
    }

    return {
      Success: true,
      Employees: employees,
    };
  }

  async updateEmployeeDetails(
    orgId: string,
    role: string,
    userId: string,
    employeeId: string,
    updateEmployeeDetailsDto: UpdateEmployeeDetailsDto,
  ) {
    // Filter out undefined values
    let updateData = Object.fromEntries(
      Object.entries(updateEmployeeDetailsDto).filter(
        ([_, v]) => v !== undefined,
      ),
    );

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    // Validate org
    const orgExists = await this.databaseService.organization.findUnique({
      where: { id: orgId },
    });
    if (!orgExists)
      throw new BadRequestException("Organization doesn't exist.");

    // Validate user
    const userExists = await this.databaseService.authCredential.findUnique({
      where: { id: userId },
    });
    if (!userExists) throw new BadRequestException("User doesn't exist.");

    // Validate employee
    const employeeExists = await this.databaseService.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employeeExists)
      throw new BadRequestException("Employee doesn't exist.");

    const employeeRole = employeeExists.role;

    // Prevent cross-org updates
    if (userExists.orgId !== employeeExists.orgId) {
      throw new BadRequestException('Unauthorized update attempt.');
    }

    // Check allowed roles
    if (!['Root', 'SuperAdmin', 'Admin'].includes(role)) {
      throw new BadRequestException(
        "This role doesn't have permission to perform this action: PUT /employee/:id",
      );
    }

    // Role-based restrictions
    if (role === 'Admin') {
      // Admins can’t assign roles
      delete updateData.roleToAssign;
      // Admins can only update Staff
      if (employeeRole !== 'Staff') {
        throw new BadRequestException('Admins can only update Staff members.');
      }
    } else if (role === 'SuperAdmin') {
      if (updateData.roleToAssign === 'SuperAdmin') {
        throw new BadRequestException(
          'Super Admins can not assign super admins.',
        );
      }
    } else if (role === 'Root') {
      // Root can update everyone
    }

    // Final update
    return this.databaseService.employee.update({
      where: { id: employeeId },
      data: updateData,
    });
  }
}
