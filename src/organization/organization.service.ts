import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateOrganizationDto } from 'src/dto/create-organization.dto';
import { EditOrganizationDto } from 'src/dto/edit-organization.dto';
import { CloudinaryService } from 'src/media/cloudinary.service';
import { MailService } from 'src/service/mail/mail.service';
import { encrypt, decrypt } from '../utils/encryption.util';
import { ConfigService } from '@nestjs/config';
import { UpdateSubscriptionDto } from 'src/dto/update-subscription.dto';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
    private readonly cloudinary: CloudinaryService,
    private config: ConfigService,
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
      settingCode,
      planId,
      startsAt,
      endsAt,
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

    const encryptionKey = this.config.get<string>('encryption.key');
    if (!encryptionKey) {
      throw new Error('Encryption key is not set in environment variables');
    }

    const settingCodeEncrypted = encrypt(settingCode, encryptionKey);

    const startsAtDate = new Date(startsAt);
    const endsAtDate = new Date(endsAt);

    if (isNaN(startsAtDate.getTime()) || isNaN(endsAtDate.getTime())) {
      throw new BadRequestException('Invalid start or end date');
    }

    if (endsAtDate <= startsAtDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const plan = await this.databaseService.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new BadRequestException('Invalid plan selected');
    }

    const result = await this.databaseService.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          email: normalizedEmail,
          address,
          contactNumber,
          contactPerson,
          gst: gst || null,
          logo: logoUrl,
          accountLimit,
          settingCodeEncrypted,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          orgId: organization.id,
          planId,
          startsAt: startsAtDate,
          endsAt: endsAtDate,
        },
      });

      return { organization, subscription };
    });

    await this.mailService.OrganizationRegistration(result.organization);

    return {
      success: true,
      message: 'Organization has been created successfully.',
      organizationDetails: result.organization,
      subscriptionDetails: result.subscription,
    };
  }

  async editOrganizationDetails(
    orgId: string,
    role: string,
    editOrganizationDto: EditOrganizationDto,
    userId: string,
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
      where: { id: targetOrgId },
    });

    if (!orgExists) {
      throw new NotFoundException("Organization doesn't exist.");
    }

    if (role === 'SuperAdmin') {
      const superAdminExist =
        await this.databaseService.userCredential.findUnique({
          where: { id: userId },
        });

      if (!superAdminExist) {
        throw new BadRequestException(
          'Invalid request. SuperAdmin does not exist.',
        );
      }

      if (superAdminExist.orgId !== orgExists.id) {
        throw new UnauthorizedException(
          'Unauthorized update attempt. SuperAdmin belongs to a different organization.',
        );
      }

      // Prevent SuperAdmin from editing accountLimit
      if ('accountLimit' in editOrganizationDto) {
        delete editOrganizationDto.accountLimit;
      }
    }

    // Only validate accountLimit if it was actually provided
    if (typeof editOrganizationDto.accountLimit === 'number') {
      const systemAccountCount =
        await this.databaseService.systemCredential.count({
          where: { orgId },
        });

      if (systemAccountCount > editOrganizationDto.accountLimit) {
        throw new BadRequestException(
          `Account limit too low. Number of current system accounts: ${systemAccountCount}`,
        );
      }
    }

    // Upload logo only if provided
    if (logo) {
      try {
        const uploaded = await this.cloudinary.uploadImage(logo, 'acs');
        logoUrl = uploaded['secure_url'];
      } catch (error) {
        throw new BadRequestException('Image upload failed');
      }
    }

    const encryptionKey = this.config.get<string>('ENCRYPTION_KEY'); // or whatever key name you use
    if (!encryptionKey) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY is not set in environment variables',
      );
    }

    // Build update data safely: exclude settingCode from DTO spread
    const { settingCode, ...restDto } = editOrganizationDto;

    const updateData: any = {
      ...restDto,
    };

    // Only update settingCodeEncrypted if a new code was provided
    if (typeof settingCode === 'string' && settingCode.trim() !== '') {
      updateData.settingCodeEncrypted = encrypt(settingCode, encryptionKey);
    }

    // Only update logo if new logo was uploaded
    if (logoUrl) {
      updateData.logo = logoUrl;
    }

    await this.databaseService.organization.update({
      where: { id: targetOrgId },
      data: updateData,
    });

    return {
      success: true,
      message: 'Organization details have been updated successfully.',
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
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin', 'System', 'Staff'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only Root, SuperAdmin, Admin and System can access details of the organization.',
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

    let settingCode: string | null = null;

    // Only try to decrypt if it actually exists
    if (organizationExist.settingCodeEncrypted) {
      const encryptionKey = this.config.get<string>('ENCRYPTION_KEY'); // or your actual key
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY is not set in environment variables');
      }

      settingCode = decrypt(
        organizationExist.settingCodeEncrypted,
        encryptionKey,
      );
    }

    // Avoid sending encrypted value back to client
    const { settingCodeEncrypted, ...safeOrg } = organizationExist;

    return {
      success: true,
      message: 'Organization details fetched successfully.',
      organizationDetails: { ...safeOrg, settingCode },
    };
  }

  async getOrgPlanDetails(orgId: string, role: string) {
    const allowedRoles = ['Root', 'SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only Root, SuperAdmin can access plan details of the organization.',
      );
    }

    const organizationExist =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
        include: {
          subscription: true,
        },
      });

    if (!organizationExist) {
      throw new NotFoundException("Organization doesn't exist.");
    }

    let settingCode: string | null = null;

    // Only try to decrypt if it actually exists
    if (organizationExist.settingCodeEncrypted) {
      const encryptionKey = this.config.get<string>('ENCRYPTION_KEY'); // or your actual key
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY is not set in environment variables');
      }

      settingCode = decrypt(
        organizationExist.settingCodeEncrypted,
        encryptionKey,
      );
    }

    // Avoid sending encrypted value back to client
    const { settingCodeEncrypted, ...safeOrg } = organizationExist;

    const subscription = organizationExist.subscription;

    if (!subscription || !subscription.planId) {
      return {
        success: true,
        message: 'Organization has no active plan',
        organizationDetails: { ...safeOrg, settingCode },
        planDetails: null,
      };
    }

    const planDetails = await this.databaseService.plan.findUnique({
      where: {
        id: subscription.planId,
      },
      include: {
        features: true,
      },
    });

    if (!planDetails) {
      throw new NotFoundException('Plan not found.');
    }

    return {
      success: true,
      message: 'Organization details fetched successfully.',
      organizationDetails: { ...safeOrg, settingCode },
      planDetails,
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

  async getSettingsCode(orgId, role, userId) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Invalid role.');
    }

    const userExists = await this.databaseService.userCredential.findUnique({
      where: {
        id: userId,
      },
    });

    if (!userExists) {
      throw new NotFoundException("Users doesn't exists.");
    }

    if (userExists.orgId !== orgId) {
      throw new UnauthorizedException('Invalid update attempt.');
    }

    const organizationExist =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    let settingCode;

    if (organizationExist?.settingCodeEncrypted) {
      const encryptionKey = this.config.get<string>('ENCRYPTION_KEY'); // or whatever key name you use
      if (!encryptionKey) {
        throw new InternalServerErrorException(
          'ENCRYPTION_KEY is not set in environment variables',
        );
      }
      settingCode = decrypt(
        organizationExist?.settingCodeEncrypted,
        encryptionKey,
      );
    } else {
      settingCode = null;
    }

    return {
      success: true,
      settingCode,
    };
  }

  async updateSubscription(userId, role, orgId, dto: UpdateSubscriptionDto) {
    const allowedRoles = ['Root'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only root user is allowed to change plan.',
      );
    }

    const userExistsAndIsRoot =
      await this.databaseService.userCredential.findFirst({
        where: {
          id: userId,
          role: 'Root',
        },
      });

    if (!userExistsAndIsRoot) {
      throw new NotFoundException("User doesn't exists.");
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    const { planId, startsAt, endsAt } = dto;

    if (new Date(startsAt) >= new Date(endsAt)) {
      throw new BadRequestException('startsAt must be before endsAt');
    }

    if (!organizationExists) {
      throw new NotFoundException("Organization doesn't exists.");
    }

    await this.databaseService.$transaction(async (tx) => {
      const planExists = await tx.plan.findFirst({
        where: {
          id: planId,
          isActive: true,
        },
      });

      if (!planExists) {
        throw new NotFoundException("Plan doesn't exists.");
      }

      await tx.subscription.update({
        where: {
          orgId,
        },
        data: {
          planId,
          startsAt,
          endsAt,
        },
      });
    });

    return {
      success: true,
      message: 'Plan updated successfully.',
    };
  }
}
