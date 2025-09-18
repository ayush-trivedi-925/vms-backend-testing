import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateDepartmentDto } from 'src/dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createDepartment(
    orgId,
    userId,
    role,
    createDepartmentDto: CreateDepartmentDto,
    qOrgId?,
  ) {
    const { name } = createDepartmentDto;
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;

    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root, superadmin and admin can add departments.',
      );
    }
    if (role !== 'Root') {
      const userExists = await this.databaseService.userCredential.findUnique({
        where: {
          id: userId,
        },
      });

      if (!userExists) {
        throw new BadRequestException('Invalid credentials.');
      }
      if (userExists.orgId !== targetOrgId) {
        throw new UnauthorizedException(
          'User belongs to different organization.',
        );
      }
    }
    const department = await this.databaseService.department.create({
      data: {
        orgId: targetOrgId,
        name,
      },
    });
    return {
      success: true,
      message: 'Department added successfully',
      departmentInfo: department,
    };
  }

  async getAllDepartments(orgId, userId, role, qOrgId?) {
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;

    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root, superadmin and admin can access departments.',
      );
    }
    if (role !== 'Root') {
      const userExists = await this.databaseService.userCredential.findUnique({
        where: {
          id: userId,
        },
      });

      if (!userExists) {
        throw new BadRequestException('Invalid credentials.');
      }
      if (userExists.orgId !== targetOrgId) {
        throw new UnauthorizedException(
          'User belongs to different organization.',
        );
      }
    }

    const departments = await this.databaseService.department.findMany({
      where: {
        orgId: targetOrgId,
      },
    });

    if (!departments.length) {
      return {
        success: true,
        message: 'No departments as of now.',
      };
    }

    return {
      success: true,
      allDepartments: departments,
    };
  }

  async deleteDepartment(orgId, userId, role, departmentId, qOrgId?) {
    const allowedRoles = ['Root', 'SuperAdmin'];
    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;

    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root and superadmin can access departments.',
      );
    }
    if (role !== 'Root') {
      const userExists = await this.databaseService.userCredential.findUnique({
        where: {
          id: userId,
        },
      });

      if (!userExists) {
        throw new BadRequestException('Invalid credentials.');
      }
      if (userExists.orgId !== targetOrgId) {
        throw new UnauthorizedException(
          'User belongs to different organization.',
        );
      }
    }

    const departmentExists = await this.databaseService.department.findUnique({
      where: {
        id: departmentId,
      },
    });

    if (!departmentExists) {
      throw new NotFoundException("Department doesn't exists.");
    }

    await this.databaseService.department.delete({
      where: {
        id: departmentId,
      },
    });

    return {
      success: true,
      message: 'Department deleted successfully.',
    };
  }
}
