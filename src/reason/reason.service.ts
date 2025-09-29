import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { AddReasonDto } from 'src/dto/add-reason.dto';

@Injectable()
export class ReasonService {
  constructor(private readonly databaseService: DatabaseService) {}

  async addReason(
    orgId,
    userId,
    role,
    addReasonDto: AddReasonDto,
    qOrgId?: string,
  ) {
    const { name } = addReasonDto;
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

    const reasonOfVisit = await this.databaseService.reasonOfVisit.create({
      data: {
        orgId: targetOrgId,
        name,
      },
    });

    return {
      success: true,
      message: 'Reason added.',
      reasonOfVisit,
    };
  }

  async addReasonBulk(
    orgId: string | null,
    role: string,
    reasonList: AddReasonDto[],
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
    for (const reasonDto of reasonList) {
      const { name } = reasonDto;
      const reason = await this.databaseService.reasonOfVisit.create({
        data: {
          name,
          orgId: targetOrgId,
        },
      });
      results.push({
        success: true,
        message: `${name} has been added successfully.`,
        details: reason,
      });
    }
    return {
      success: true,
      imported: results.filter((r) => r.success).length,
      details: results,
    };
  }

  async getAllReasons(orgId, role, qOrgId?) {
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin', 'System'];
    const targetOrgId =
      (role === 'Root' && qOrgId) || (role === 'System' && qOrgId)
        ? qOrgId
        : orgId;

    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root, superadmin and admin can access reasons of visit.',
      );
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: targetOrgId },
      });

    if (!organizationExists) {
      throw new NotFoundException("Organization doesn't exist.");
    }

    const reasonsOfVisit = await this.databaseService.reasonOfVisit.findMany({
      where: {
        orgId: targetOrgId,
      },
    });

    if (!reasonsOfVisit.length) {
      return {
        success: true,
        message: 'No reasons of visit as of now.',
      };
    }

    return {
      success: true,
      allReasonsOfVisit: reasonsOfVisit,
    };
  }

  async deleteReason(orgId, userId, role, reasonId, qOrgId?) {
    const allowedRoles = ['Root', 'SuperAdmin'];
    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;

    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root and superadmin can delete reasons of visit.',
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

    const reasonExists = await this.databaseService.reasonOfVisit.findUnique({
      where: {
        id: reasonId,
      },
    });

    if (!reasonExists) {
      throw new NotFoundException("Reason of visit doesn't exists.");
    }

    await this.databaseService.reasonOfVisit.delete({
      where: {
        id: reasonId,
      },
    });

    return {
      success: true,
      message: 'Reason of visit deleted successfully.',
    };
  }
}
