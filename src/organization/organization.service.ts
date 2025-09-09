import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrganization(
    role: string,
    createOrganizationDto: CreateOrganizationDto,
  ) {
    const allowedRoles = ['Root'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root user can create an organization.',
      );
    }
    const { name, email } = createOrganizationDto;
    const normalizedEmail = email.toLowerCase().trim();
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          email: normalizedEmail,
        },
      });
    if (organizationExists) {
      throw new BadRequestException('Organization already exist.');
    }

    const organization = await this.databaseService.organization.create({
      data: {
        name,
        email: normalizedEmail,
      },
    });

    return {
      success: true,
      message: 'Organization has been created successfully.',
      organizationDetails: organization,
    };
  }

  async getAllOrganization(role: string) {
    const allowedRoles = ['Root'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root user can access the list of organization.',
      );
    }
    const allOrganizations = await this.databaseService.organization.findMany();
    if (allOrganizations.length === 0) {
      return {
        success: true,
        message: 'There are no organizations currently.',
        numberOfOrganizations: 0,
      };
    }
    return {
      success: true,
      numberOfOrganization: allOrganizations.length,
      allOrganizations,
    };
  }

  async getOrganizationDetails(orgId: string, role: string) {
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only Root and superadmin can access details of the organization.',
      );
    }
    const organizationExist =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExist) {
      throw new NotFoundException("Organization doesn't exists.");
    }

    return {
      success: true,
      message: 'Organization details fetched successfully.',
      organizationDetails: organizationExist,
    };
  }

  async deleteOrganization(orgId, role: string) {
    const allowedRoles = ['Root'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root user can delete organization.',
      );
    }

    const organizationExist =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExist) {
      throw new NotFoundException("Organization doesn't exist.");
    }

    await this.databaseService.organization.delete({
      where: {
        id: orgId,
      },
    });
    return {
      success: true,
      message: 'Organization has been deleted successfully.',
    };
  }
}
