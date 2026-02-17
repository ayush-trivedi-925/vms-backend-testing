import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRoleEnum, Weekday } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { AddStaffMemberDto } from 'src/dto/add-staff-member.dto';
import { EditStaffMemberDto } from 'src/dto/edit-staff-member.dto';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/service/mail/mail.service';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
import * as QRCode from 'qrcode';

const tz = 'Asia/Kolkata';
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class StaffService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  private generateOneTimePassword(orgName: string): string {
    const prefix = orgName.substring(0, 3).toUpperCase();
    const randomDigits = Math.floor(100 + Math.random() * 900); // 100–999
    return `${prefix}${randomDigits}`;
  }

  private async generateUniqueEmployeeCode(
    tx: any,
    orgId: string,
  ): Promise<string> {
    // Fetch org once (instead of on every loop)
    const org = await this.databaseService.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    if (!org) {
      throw new Error(`Organization not found: ${orgId}`);
    }

    // Normalize prefix: take first 3 letters, uppercase, remove spaces
    const prefix = org.name.replace(/\s+/g, '').substring(0, 3).toUpperCase();

    while (true) {
      const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      const employeeCode = `${prefix}${random}`;

      const exists = await tx.staff.findFirst({
        where: { employeeCode, orgId },
      });

      if (!exists) return employeeCode;
    }
  }

  async addStaffMember(
    orgId: string | null,
    role: string,
    addStaffMemberDto: AddStaffMemberDto,
    qOrgId?: string,
  ) {
    const { name, email, designation, departmentId } = addStaffMemberDto;

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

    const result = await this.databaseService.$transaction(async (tx) => {
      const employeeCode = await this.generateUniqueEmployeeCode(
        tx,
        targetOrgId,
      );
      const oneTimePassword = this.generateOneTimePassword(
        organizationExists.name,
      );
      const hashedPassword = await bcrypt.hash(oneTimePassword, 10);

      const staff = await tx.staff.create({
        data: {
          orgId: targetOrgId,
          name,
          email: normalizedEmail,
          departmentId,
          designation,
          employeeCode,
        },
        include: {
          department: true,
          organization: true,
        },
      });

      // Create a new UserCredential (active by default)
      await tx.userCredential.create({
        data: {
          orgId: targetOrgId,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'Staff',
          firstTimeLogin: true,
          staff: {
            connect: { id: staff.id },
          },
        },
      });

      return { staff, oneTimePassword };
    });

    let qrCodeBuffer: Buffer | null = null;
    try {
      // Generate QR code as buffer
      qrCodeBuffer = await QRCode.toBuffer(
        JSON.stringify({ empId: result.staff.employeeCode }),
      );
    } catch (err) {
      console.error('Failed to generate QR code', err);
      qrCodeBuffer = null;
    }

    try {
      await this.mailService.StaffRegistration(
        {
          name: result.staff.name,
          email: result.staff.email,
          employeeCode: result.staff.employeeCode,
          designation: result.staff.designation,
          departmentName: result.staff.department?.name ?? 'N/A',
          orgName: result.staff.organization.name,
          oneTimePassword: result.oneTimePassword,
          qrCodeBuffer,
        },
        organizationExists,
      );
    } catch (mailErr) {
      // Log the mail error, but don't fail the entire operation.
      // Replace console.error with your logger.
      console.error('Failed to send staff registration email', mailErr);
    }
    return {
      success: true,
      message: `${name} has been added successfully.`,
      staffMemberDetails: result.staff,
    };
  }

  async addStaffBulk(
    orgId: string | null,
    role: string,
    staffList: AddStaffMemberDto[],
    qOrgId?: string,
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

    const results: any[] = [];
    const createdStaffForMail: any[] = []; // collect created staff to email later

    // DB transaction: create staff records (fast)
    await this.databaseService.$transaction(async (tx) => {
      for (const staffDto of staffList) {
        const { name, email, designation } = staffDto;
        const normalizedEmail = email.toLowerCase().trim();
        const departmentName = staffDto.departmentId;

        const staffMemberExists = await tx.staff.findFirst({
          where: { email: normalizedEmail },
        });

        if (staffMemberExists) {
          results.push({
            success: false,
            message: `${name} already exists.`,
            email,
          });
          continue;
        }

        const department = await tx.department.findFirst({
          where: { name: departmentName, orgId: targetOrgId },
        });

        if (!department || department.orgId !== targetOrgId) {
          results.push({
            success: false,
            message: `Department ${departmentName} not found.`,
            email: staffDto.email,
          });
          continue;
        }

        // Generate unique employee code using tx helper
        const employeeCode = await this.generateUniqueEmployeeCode(
          tx,
          targetOrgId,
        );

        // Create staff with generated employee code
        const staffMember = await tx.staff.create({
          data: {
            orgId: targetOrgId,
            name,
            email: normalizedEmail,
            designation,
            departmentId: department.id,
            employeeCode,
          },
          include: { department: true }, // include so we know department name
        });

        // Generate OTP
        const oneTimePassword = this.generateOneTimePassword(
          organizationExists.name,
        );

        // Hash OTP
        const hashedPassword = await bcrypt.hash(oneTimePassword, 10);

        // Create credential
        await tx.userCredential.create({
          data: {
            orgId: targetOrgId,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'Staff',
            firstTimeLogin: true,
            staff: {
              connect: { id: staffMember.id },
            },
          },
        });

        results.push({
          success: true,
          message: `${name} has been added successfully.`,
          staffMemberDetails: staffMember,
        });

        // Collect minimal info for sending email after transaction
        createdStaffForMail.push({
          id: staffMember.id,
          name: staffMember.name,
          email: staffMember.email,
          employeeCode: staffMember.employeeCode,
          designation: staffMember.designation,
          departmentName: staffMember.department?.name ?? 'N/A',
          oneTimePassword,
        });
      }
    }); // end transaction

    // Fire-and-forget QR generation + email sends (do NOT await)
    // Each item runs in its own async IIFE; errors are caught and logged.
    createdStaffForMail.forEach((s) => {
      (async () => {
        try {
          // build QR payload (string)
          const qrPayload = JSON.stringify({ empId: s.employeeCode });

          // generate PNG buffer (may be CPU-bound for many items)
          let qrCodeBuffer: Buffer | null = null;
          try {
            qrCodeBuffer = await QRCode.toBuffer(qrPayload, {
              type: 'png',
              margin: 1,
              width: 300,
            });
          } catch (qrErr) {
            console.error(`Failed to generate QR for ${s.email}`, qrErr);
            qrCodeBuffer = null;
          }

          // call mailer (await inside this IIFE so we can catch mail errors)
          try {
            await this.mailService.StaffRegistration(
              {
                oneTimePassword: s.oneTimePassword,
                name: s.name,
                email: s.email,
                employeeCode: s.employeeCode,
                designation: s.designation,
                departmentName: s.departmentName,
                qrCodeBuffer, // attach buffer (may be null - mailer should handle)
              },
              organizationExists,
            );
          } catch (mailErr) {
            console.error(
              `Failed to send registration mail to ${s.email}`,
              mailErr,
            );
          }
        } catch (err) {
          // catch any unexpected errors per user
          console.error(`Background job failed for ${s.email}`, err);
        }
      })();
    });

    // Return immediately (emails are being sent in background)
    return {
      success: true,
      imported: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      details: results,
      message: 'Staff created. Emails (with QR) are being sent in background.',
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

    const startOfToday = dayjs().tz(tz).startOf('day').toDate(); // local-day start -> Date
    const startOfTomorrow = dayjs()
      .tz(tz)
      .add(1, 'day')
      .startOf('day')
      .toDate();

    const allStaffMembers = await this.databaseService.staff.findMany({
      where: { orgId: targetOrgId },
      include: {
        department: true,
        attendanceEvents: {
          where: {
            timestamp: {
              gte: startOfToday,
              lt: startOfTomorrow,
            },
          },
          orderBy: { timestamp: 'desc' },
        },
        attendanceSessions: {
          where: {
            date: {
              gte: startOfToday,
              lt: startOfTomorrow,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
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
    const allowedRoles = ['Root', 'SuperAdmin', 'Admin', 'System', 'Staff'];
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

    const startOfToday = dayjs().tz(tz).startOf('day').toDate(); // local-day start -> Date
    const startOfTomorrow = dayjs()
      .tz(tz)
      .add(1, 'day')
      .startOf('day')
      .toDate();

    const staffExists = await this.databaseService.staff.findUnique({
      where: {
        id: staffId,
      },
      include: {
        organization: {
          include: {
            workingHours: true,
          },
        },
        department: true,
        attendanceEvents: {
          where: {
            timestamp: {
              gte: startOfToday,
              lt: startOfTomorrow,
            },
          },
          orderBy: { timestamp: 'desc' },
        },
        attendanceSessions: {
          where: {
            date: {
              gte: startOfToday,
              lt: startOfTomorrow,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        workingHours: true,
      },
    });
    if (!staffExists) {
      throw new NotFoundException("Staff member doesn't exist.");
    }
    if (staffExists.orgId !== targetOrgId) {
      throw new BadRequestException(
        'This staff member does not belong to the specified organization.',
      );
    }
    return {
      success: true,
      staffDetails: staffExists,
    };
  }

  async getStaffMemberDetailsUserId(
    orgId: string | null,
    role: string,
    userId: string,
  ) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Staff'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only superadmin, and admin can access the staff members of an organization.',
      );
    }
    // Decide which orgId to use
    const targetOrgId = orgId;

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
        userId,
      },
      include: {
        organization: {
          include: {
            workingHours: true,
          },
        },
        department: true,
        workingHours: true,
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

    const { workingHours, ...restDto } = editStaffMemberDto;
    const updateData: any = { ...restDto };

    const ALL_DAYS: Weekday[] = [
      Weekday.MONDAY,
      Weekday.TUESDAY,
      Weekday.WEDNESDAY,
      Weekday.THURSDAY,
      Weekday.FRIDAY,
      Weekday.SATURDAY,
      Weekday.SUNDAY,
    ];

    return await this.databaseService.$transaction(async (tx) => {
      // =============================
      // 1. Working Hours
      // =============================
      if (workingHours) {
        const { startsAt, endsAt, days } = workingHours;

        if (startsAt >= endsAt) {
          throw new BadRequestException(
            'Working hours start time must be before end time',
          );
        }

        if (!days.length) {
          throw new BadRequestException(
            'At least one working day must be selected',
          );
        }

        for (const day of ALL_DAYS) {
          const isSelected = days.includes(day);

          await tx.workingHours.upsert({
            where: {
              dayOfWeek_staffId: {
                dayOfWeek: day,
                staffId,
              },
            },
            update: {
              isClosed: !isSelected,
              ...(isSelected ? { startsAt, endsAt } : {}),
            },
            create: {
              dayOfWeek: day,
              staffId,
              isClosed: !isSelected,
              startsAt: isSelected ? startsAt : '09:00',
              endsAt: isSelected ? endsAt : '18:00',
            },
          });
        }
      }

      // =============================
      // 2. SuperAdmin uniqueness
      // =============================
      if (updateData.role === 'SuperAdmin' && staff.role !== 'SuperAdmin') {
        const existingSuperAdmin = await tx.userCredential.findFirst({
          where: {
            orgId: targetOrgId,
            role: 'SuperAdmin',
          },
          include: { staff: true },
        });

        if (
          existingSuperAdmin &&
          existingSuperAdmin.staff &&
          existingSuperAdmin.staff?.id !== staffId
        ) {
          await tx.userCredential.update({
            where: { id: existingSuperAdmin.id },
            data: { role: 'Admin' },
          });

          await tx.staff.update({
            where: { id: existingSuperAdmin.staff.id },
            data: { role: 'Admin' },
          });
        }
      }

      // =============================
      // 3. Update Staff record
      // =============================
      await tx.staff.update({
        where: { id: staffId },
        data: updateData,
      });

      // =============================
      // 4. If credential exists
      // =============================
      if (staff.userId) {
        const userUpdateData: any = {
          role: updateData.role,
          email: updateData.email,
        };

        // account status handling
        if (
          (staff.role === 'Admin' || staff.role === 'SuperAdmin') &&
          updateData.role === 'Staff'
        ) {
          userUpdateData.accountStatus = 'Disabled';
        }

        if (
          (staff.role === 'Staff' && updateData.role === 'Admin') ||
          updateData.role === 'SuperAdmin'
        ) {
          userUpdateData.accountStatus = 'Active';
        }

        await tx.userCredential.update({
          where: { id: staff.userId },
          data: userUpdateData,
        });

        return {
          success: true,
          message: 'Staff details updated successfully.',
        };
      }

      // =============================
      // 5. Create credential if missing
      // =============================
      const oneTimePassword = this.generateOneTimePassword(organization.name);
      const hashedPassword = await bcrypt.hash(oneTimePassword, 10);

      await tx.userCredential.create({
        data: {
          orgId: targetOrgId,
          email: updateData.email,
          password: hashedPassword,
          role: updateData.role,
          firstTimeLogin: true,
          staff: {
            connect: { id: staffId },
          },
        },
      });

      await this.mailService.sendUserRegistrationMail(
        staff,
        organization,
        oneTimePassword,
        updateData.role,
      );

      return {
        success: true,
        message: 'Staff updated and one-time password sent to email.',
      };
    });
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

  async getSuperAdminDetails(orgId, role, userId, qOrgId) {
    const allowedRoles = ['SuperAdmin', 'Root'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Invalid role.');
    }

    const targetOrgId = role === 'Root' && qOrgId ? qOrgId : orgId;
    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: targetOrgId,
        },
      });

    if (!organizationExists) {
      throw new NotFoundException('Invalid organization.');
    }

    if (role !== 'Root') {
      const userExists = await this.databaseService.userCredential.findUnique({
        where: {
          id: userId,
        },
      });
      if (userExists?.orgId !== targetOrgId) {
        throw new UnauthorizedException('Credentials mismatch.');
      }
    }

    const superadminDetails = await this.databaseService.staff.findFirst({
      where: {
        orgId: targetOrgId,
        role: 'SuperAdmin',
      },
      include: {
        department: true,
      },
    });

    return {
      success: true,
      superadminDetails,
    };
  }
}
