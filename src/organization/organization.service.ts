import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
import { EditOrganizationDto } from 'src/dto/edit-organization.dto';
import { CloudinaryService } from 'src/media/cloudinary.service';
import { MailService } from 'src/service/mail/mail.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async createOrganization(
    role: string,
    createOrganizationDto: CreateOrganizationDto,
    logo?: Express.Multer.File,
  ) {
    let logoUrl: string | null = null;
    const allowedRoles = ['Root'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root user can create an organization.',
      );
    }
    const {
      name,
      email,
      address,
      contactNumber,
      contactPerson,
      gst,
      accountLimit,
    } = createOrganizationDto;
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

    if (logo) {
      try {
        const uploaded = await this.cloudinary.uploadImage(logo, 'acs');
        logoUrl = uploaded['secure_url'];
      } catch (error) {
        throw new BadRequestException('Image upload failed');
      }
    }

    const organization = await this.databaseService.organization.create({
      data: {
        name,
        email: normalizedEmail,
        address,
        contactNumber,
        contactPerson,
        gst: gst || null,
        logo: logoUrl,
        accountLimit,
      },
    });

    await this.mailService.OrganizationRegistration(organization);

    return {
      success: true,
      message: 'Organization has been created successfully.',
      organizationDetails: organization,
    };
  }

  async editOrganizationDetails(
    orgId,
    role,
    editOrganizationDto: EditOrganizationDto,
    userId,
    logo?: Express.Multer.File,
  ) {
    let logoUrl: string | null = null;
    const allowedRoles = ['Root', 'SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root and superadmin are allowed to edit organization details.',
      );
    }
    const targetOrgId = orgId;
    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    const orgExists = await this.databaseService.organization.findUnique({
      where: {
        id: targetOrgId,
      },
    });

    if (!orgExists) {
      throw new NotFoundException("Organization doesn't exists.");
    }

    if (role === 'SuperAdmin') {
      const superAdminExist =
        await this.databaseService.userCredential.findUnique({
          where: {
            id: userId,
          },
        });

      if (!superAdminExist) {
        throw new BadRequestException(
          'Invalid request. SuperAdmin does not exists.',
        );
      }
      // If superadmin belongs to the perticular organization
      if (superAdminExist.orgId !== orgExists.id) {
        throw new UnauthorizedException(
          'Unauthorized updated attempt. SuperAdmin belongs to different organization.',
        );
      }

      // Prevent SuperAdmin from editing accountLimit
      if ('accountLimit' in editOrganizationDto) {
        delete editOrganizationDto.accountLimit;
      }
    }

    if (editOrganizationDto.accountLimit) {
      const systemAccountCount =
        await this.databaseService.systemCredential.count({
          where: {
            orgId,
          },
        });

      if (systemAccountCount > editOrganizationDto.accountLimit) {
        throw new BadRequestException(
          `Account limit too low. Number of current system accounts: ${systemAccountCount}`,
        );
      }
    }

    if (logo) {
      try {
        const uploaded = await this.cloudinary.uploadImage(logo, 'acs');
        logoUrl = uploaded['secure_url'];
      } catch (error) {
        throw new BadRequestException('Image upload failed');
      }
    }

    await this.databaseService.organization.update({
      where: {
        id: targetOrgId,
      },
      data: { ...editOrganizationDto, logo: logoUrl },
    });

    return {
      success: true,
      message: 'Organizationd details have been upated successfully.',
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
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin', 'System'];
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

  async getSystemAccountLimit(orgId, role) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Invalid role.');
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExists) {
      throw new NotFoundException('Invalid organization.');
    }

    return {
      success: true,
      accountLimit: organizationExists.accountLimit,
    };
  }
}
