import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { EditOrganizationDto } from '../dto/edit-organization.dto';
import { MailService } from '../service/mail/mail.service';
import { encrypt, decrypt } from '../utils/encryption.util';
import { ConfigService } from '@nestjs/config';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { Weekday } from '@prisma/client';
import { UpdateDayWorkingHoursDto } from '../dto/update-working-hour-day.dto';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
    private readonly s3Service: S3Service,
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
      timezone,
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
        logoUrl = await this.s3Service.uploadImage(logo);
      } catch (error) {
        console.error('🔥 S3 UPLOAD ERROR:', error);
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
          timezone,
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

    if (logo) {
      try {
        logoUrl = await this.s3Service.uploadImage(logo);
      } catch (error) {
        console.error('🔥 S3 UPLOAD ERROR:', error);
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
    const { settingCode, workingHours, ...restDto } = editOrganizationDto;

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
    const ALL_DAYS: Weekday[] = [
      Weekday.MONDAY,
      Weekday.TUESDAY,
      Weekday.WEDNESDAY,
      Weekday.THURSDAY,
      Weekday.FRIDAY,
      Weekday.SATURDAY,
      Weekday.SUNDAY,
    ];

    // validate working hours BEFORE transaction
    if (workingHours) {
      if (workingHours.startsAt >= workingHours.endsAt) {
        throw new BadRequestException(
          'Working hours start time must be before end time',
        );
      }

      if (!workingHours.days.length) {
        throw new BadRequestException(
          'At least one working day must be selected',
        );
      }
    }

    await this.databaseService.$transaction(async (tx) => {
      // 1 update organization
      await tx.organization.update({
        where: { id: targetOrgId },
        data: updateData,
      });

      // 2 upsert working hours (all 7 days)
      if (workingHours) {
        const { startsAt, endsAt, days } = workingHours;

        for (const day of ALL_DAYS) {
          const isSelected = days.includes(day);

          await tx.workingHours.upsert({
            where: {
              dayOfWeek_orgId: {
                dayOfWeek: day,
                orgId: targetOrgId,
              },
            },
            update: {
              isClosed: !isSelected,
              ...(isSelected ? { startsAt, endsAt } : {}),
            },
            create: {
              dayOfWeek: day,
              orgId: targetOrgId,
              isClosed: !isSelected,
              startsAt: isSelected ? startsAt : '09:00',
              endsAt: isSelected ? endsAt : '18:00',
            },
          });
        }
      }
    });

    return {
      success: true,
      message: 'Organization details have been updated successfully.',
    };
  }

  // async updateSingleDayWorkingHours(
  //   userId: string,
  //   orgId: string,
  //   role: string,
  //   dto: UpdateDayWorkingHoursDto,
  // ) {
  //   const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
  //   if (!allowedRoles.includes(role)) {
  //     throw new ForbiddenException('Access denied.');
  //   }

  //   const userExists = await this.databaseService.userCredential.findUnique({
  //     where: {
  //       id: userId,
  //     },
  //   });

  //   if (
  //     !userExists ||
  //     !['Root', 'SuperAdmin', 'Admin'].includes(userExists.role)
  //   ) {
  //     throw new NotFoundException('User not found.');
  //   }

  //   const { day, startsAt, endsAt } = dto;

  //   if (startsAt >= endsAt) {
  //     throw new BadRequestException('Start time must be before end time');
  //   }

  //   return this.databaseService.workingHours.upsert({
  //     where: {
  //       dayOfWeek_orgId: {
  //         dayOfWeek: day,
  //         orgId,
  //       },
  //     },
  //     update: {
  //       isClosed: false, // forced open
  //       startsAt,
  //       endsAt,
  //     },
  //     create: {
  //       orgId,
  //       dayOfWeek: day,
  //       isClosed: false, // forced open
  //       startsAt,
  //       endsAt,
  //     },
  //   });
  // }

  // async closeSingleDay(
  //   userId: string,
  //   orgId: string,
  //   role: string,
  //   day: Weekday,
  // ) {
  //   const allowedRoles = ['Root', 'SuperAdmin', 'Admin'];
  //   if (!allowedRoles.includes(role)) {
  //     throw new ForbiddenException('Access denied.');
  //   }

  //   const userExists = await this.databaseService.userCredential.findUnique({
  //     where: {
  //       id: userId,
  //     },
  //   });

  //   if (
  //     !userExists ||
  //     !['Root', 'SuperAdmin', 'Admin'].includes(userExists.role)
  //   ) {
  //     throw new NotFoundException('User not found.');
  //   }

  //   // (include your role/user checks like other APIs)
  //   return this.databaseService.workingHours.upsert({
  //     where: { dayOfWeek_orgId: { orgId, dayOfWeek: day } },
  //     update: { isClosed: true },
  //     create: {
  //       orgId,
  //       dayOfWeek: day,
  //       isClosed: true,
  //       startsAt: '09:00',
  //       endsAt: '18:00',
  //     },
  //   });
  // }

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
        include: {
          workingHours: true,
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
      await tx.subscription.upsert({
        where: {
          orgId,
        },
        update: {
          planId,
          startsAt,
          endsAt,
        },
        create: {
          orgId,
          planId,
          startsAt,
          endsAt,
          status: 'ACTIVE',
        },
      });
    });

    return {
      success: true,
      message: 'Plan updated successfully.',
    };
  }

  async getMyFeatures(orgId: string, role: string, userId: string) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Staff', 'System'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Invalid role.');
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
        include: {
          subscription: {
            include: {
              plan: {
                include: { features: true },
              },
            },
          },
        },
      });

    if (!organizationExists) {
      throw new NotFoundException('Invalid organization details.');
    }

    const userExists = await this.databaseService.userCredential.findFirst({
      where: {
        id: userId,
        orgId,
      },
    });

    if (!userExists) {
      throw new NotFoundException("User doesn't exists.");
    }

    if (!organizationExists?.subscription?.plan) {
      return { features: {} };
    }

    const features = organizationExists.subscription.plan.features.reduce(
      (acc, f) => {
        acc[f.feature] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );

    return { features };
  }
}
