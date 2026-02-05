import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateDepartmentDto } from '../dto/create-department.dto';

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
    const normalizedDepartment = name.toLowerCase().trim();
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

    const departmentExist = await this.databaseService.department.findFirst({
      where: {
        orgId: targetOrgId,
        name,
      },
    });

    if (departmentExist?.name.toLowerCase().trim() === normalizedDepartment) {
      throw new BadRequestException('Department already exists.');
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

  async addDepartmentBulk(
    orgId: string | null,
    role: string,
    departmentList: CreateDepartmentDto[],
    qOrgId: string | null,
  ) {
    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;
    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root, superadmin and admin can add employee',
      );
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: targetOrgId },
      });

    if (!organizationExists) {
      throw new NotFoundException("Organization doesn't exist.");
    }
    const results: any = [];
    for (const departmentDto of departmentList) {
      const { name } = departmentDto;
      const normalizedDepartment = name.toLowerCase().trim();

      const departmentExist = await this.databaseService.department.findFirst({
        where: {
          orgId: targetOrgId,
          name,
        },
      });

      if (departmentExist?.name.toLowerCase().trim() === normalizedDepartment) {
        results.push({
          success: false,
          message: `${name} already exists.`,
        });
        continue;
      }

      const department = await this.databaseService.department.create({
        data: {
          name,
          orgId: targetOrgId,
        },
      });
      results.push({
        success: true,
        message: `${name} has been added successfully.`,
        details: department,
      });
    }
    return {
      success: true,
      imported: results.filter((r) => r.success).length,
      details: results,
    };
  }

  async getAllDepartments(
    orgId,
    userId,
    role,
    sortBy = 'createdAt',
    order: 'asc' | 'desc' = 'desc',
    qOrgId?,
  ) {
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;
    const validFields = ['name', 'createdAt'];
    const sortField = validFields.includes(sortBy) ? sortBy : 'createdAt';

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
      orderBy: { [sortBy]: order },
    });

    if (!departments.length) {
      return {
        success: true,
        message: 'No departments as of now.',
      };
    }

    const staffCounts = await this.databaseService.staff.groupBy({
      by: ['departmentId'],
      _count: { departmentId: true },
    });

    // Map departmentId to count for fast lookup
    const countMap = Object.fromEntries(
      staffCounts.map((sc) => [sc.departmentId, sc._count.departmentId]),
    );

    // Attach staff count to each department
    const departmentsWithCounts = departments.map((dept) => ({
      ...dept,
      staffCount: countMap[dept.id] || 0,
    }));

    return {
      success: true,
      allDepartments: departmentsWithCounts,
      sortBy,
      order,
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
        'Only root and superadmin can delete department.',
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
