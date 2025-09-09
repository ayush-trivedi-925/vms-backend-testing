import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRoleEnum } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { AddStaffMemberDto } from 'src/dto/add-staff-member.dto';
import { EditStaffMemberDto } from 'src/dto/edit-staff-member.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffService {
  constructor(private readonly databaseService: DatabaseService) {}
  async addStaffMember(
    orgId: string | null,
    role: string,
    addStaffMemberDto: AddStaffMemberDto,
    qOrgId?: string,
  ) {
    const { name, email, designation, department } = addStaffMemberDto;
    console.log(qOrgId);
    console.log(orgId);
    // Decide which orgId to use
    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;

    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root, superadmin and admin can add employee',
      );
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: targetOrgId,
        },
      });

    if (!organizationExists) {
      throw new NotFoundException("Organization doesn't exist.");
    }

    const staffMemberExists = await this.databaseService.staff.findFirst({
      where: {
        email: normalizedEmail,
        orgId: targetOrgId,
      },
    });

    if (staffMemberExists) {
      throw new BadRequestException('Member already exist.');
    }

    const staffMember = await this.databaseService.staff.create({
      data: {
        orgId: targetOrgId,
        name,
        email: normalizedEmail,
        department,
        designation,
      },
    });
    return {
      success: true,
      message: `${name} has been added successfully.`,
      staffMemberDetails: staffMember,
    };
  }

  async getAllStaffMemberDetails(
    orgId: string | null,
    role: string,
    qOrgId?: string,
  ) {
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin', 'System'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root, superadmin, and admin can access the staff members of an organization.',
      );
    }

    // Decide which orgId to use
    const targetOrgId =
      (role === 'Root' && qOrgId) || (role === 'System' && qOrgId)
        ? qOrgId
        : orgId;

    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: targetOrgId },
      });

    if (!organizationExists) {
      throw new NotFoundException("Organization doesn't exist.");
    }

    const allStaffMembers = await this.databaseService.staff.findMany({
      where: { orgId: targetOrgId },
    });

    if (allStaffMembers.length === 0) {
      return {
        success: true,
        message: 'There is no staff in this organization currently.',
      };
    }

    return {
      success: true,
      numberOfStaff: allStaffMembers.length,
      staffDetails: allStaffMembers,
    };
  }

  async getStaffMemberDetails(
    orgId: string | null,
    role: string,
    staffId: string,
    userId: string,
    qOrgId?: string,
  ) {
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root, superadmin, and admin can access the staff members of an organization.',
      );
    }
    // Decide which orgId to use
    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;

    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: targetOrgId },
      });

    if (!organizationExists) {
      throw new NotFoundException("Organization doesn't exist.");
    }

    const staffExists = await this.databaseService.staff.findUnique({
      where: {
        id: staffId,
      },
      include: {
        organization: true,
      },
    });
    if (!staffExists) {
      throw new NotFoundException("Staff member doesn't exist.");
    }
    if (staffExists.orgId !== targetOrgId) {
      throw new UnauthorizedException(
        'This staff member does not belong to the specified organization.',
      );
    }
    return {
      success: true,
      staffDetails: staffExists,
    };
  }

  async editStaffMemberDetails(
    orgId: string | null,
    role: string,
    staffId: string,
    editStaffMemberDto: EditStaffMemberDto,
    qOrgId?: string,
  ) {
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('You are not allowed to edit staff.');
    }

    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;
    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    const organization = await this.databaseService.organization.findUnique({
      where: { id: targetOrgId },
    });
    if (!organization) {
      throw new NotFoundException("Organization doesn't exist.");
    }

    const staff = await this.databaseService.staff.findUnique({
      where: { id: staffId },
    });
    if (!staff) {
      throw new NotFoundException("Staff member doesn't exist.");
    }

    if (staff.orgId !== targetOrgId) {
      throw new UnauthorizedException(
        'Staff does not belong to this organization.',
      );
    }

    // Check if updating to SuperAdmin
    if (editStaffMemberDto.role === 'SuperAdmin') {
      const existingSuperAdmin =
        await this.databaseService.userCredential.findFirst({
          where: {
            orgId: targetOrgId,
            role: 'SuperAdmin',
          },
        });

      if (existingSuperAdmin) {
        throw new BadRequestException(
          'This organization already has a SuperAdmin.',
        );
      }
    }

    // CASE 1: Staff already linked to UserCredential
    if (staff.userId) {
      await this.databaseService.staff.update({
        where: { id: staffId },
        data: {
          ...editStaffMemberDto,
        },
      });

      await this.databaseService.userCredential.update({
        where: { id: staff.userId },
        data: {
          role: editStaffMemberDto.role as AuthRoleEnum, // Sync role in UserCredential
        },
      });

      return { success: true, message: 'Staff details updated successfully.' };
    }

    // CASE 2: Staff does not have a linked UserCredential
    const oneTimePassword = 'SegueIT@123';
    const hashedPassword = await bcrypt.hash(oneTimePassword, 10);
    // First update the Staff record
    await this.databaseService.staff.update({
      where: { id: staffId },
      data: {
        ...editStaffMemberDto,
      },
    });

    // Then create the UserCredential
    const newUser = await this.databaseService.userCredential.create({
      data: {
        orgId: targetOrgId,
        email: staff.email,
        password: hashedPassword,
        role: editStaffMemberDto.role as AuthRoleEnum,
        firstTimeLogin: true,
        staff: {
          connect: { id: staffId },
        },
      },
    });
    return {
      success: true,
      message: 'Staff updated and one-time password sent to email.',
    };
  }

  async deleteStaffMember(
    orgId: string | null,
    role: string,
    staffId: string,
    qOrgId?: string,
  ) {
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('You are not allowed to delete staff.');
    }

    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;
    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    // Check if org exists
    const organization = await this.databaseService.organization.findUnique({
      where: { id: targetOrgId },
    });
    if (!organization) {
      throw new NotFoundException("Organization doesn't exist.");
    }

    // Check if staff exists
    const staff = await this.databaseService.staff.findUnique({
      where: { id: staffId },
    });
    if (!staff) {
      throw new NotFoundException("Staff member doesn't exist.");
    }

    // Ensure staff belongs to same org (unless Root)
    if (role !== 'Root' && staff.orgId !== targetOrgId) {
      throw new UnauthorizedException(
        'Staff does not belong to this organization.',
      );
    }

    // Role-based delete rules
    if (role === 'Root') {
      // Root can delete anyone
    } else if (role === 'SuperAdmin') {
      if (staff.role === 'SuperAdmin') {
        throw new UnauthorizedException(
          'SuperAdmin cannot delete another SuperAdmin.',
        );
      }
      // Can delete Admin or Staff
    } else if (role === 'Admin') {
      if (staff.role !== 'Staff') {
        throw new UnauthorizedException('Admin can only delete Staff.');
      }
    }

    //Perform deletion
    await this.databaseService.staff.delete({ where: { id: staffId } });
    if (staff.userId) {
      await this.databaseService.userCredential.delete({
        where: { id: staff.userId },
      });
    }

    return {
      success: true,
      message: 'Staff member deleted successfully.',
    };
  }
}
