import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { EndVisitDto } from 'src/dto/end-visit.dto';
import { StartVisitDto } from 'src/dto/start-visit.dto';
import { CloudinaryService } from 'src/media/cloudinary.service';
import { MailService } from 'src/service/mail/mail.service';
import * as QRCode from 'qrcode';
import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcrypt';

@Injectable()
export class VisitService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
    private readonly cloudinary: CloudinaryService,
  ) {}
  async startVisit(
    orgId: string,
    systemId: string,
    startVisitDto: StartVisitDto,
    checkInPicture?: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;
    const { fullName, email, visitorOrganization, reasonId, staffId } =
      startVisitDto;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFullName = fullName.trim();
    const systemCredentialsExists =
      await this.databaseService.systemCredential.findUnique({
        where: {
          id: systemId,
        },
        include: {
          organization: true,
        },
      });

    if (!systemCredentialsExists) {
      throw new BadRequestException('Invalid user id.');
    }

    if (systemCredentialsExists.organization.id !== orgId) {
      throw new BadRequestException('Invalid credentials.');
    }

    const staffExists = await this.databaseService.staff.findUnique({
      where: {
        id: staffId,
        orgId,
      },
    });

    if (!staffExists) {
      throw new UnauthorizedException(
        "Invalid staff id or staff doesn't belong to your organization",
      );
    }

    // Check for existing active visit for this email
    const activeVisit = await this.databaseService.visit.findFirst({
      where: {
        email: normalizedEmail,
        orgId: orgId,
        status: 'ONGOING', // Assuming you have this status
      },
    });

    if (activeVisit) {
      throw new BadRequestException('Visitor already has an active visit.');
    }

    if (checkInPicture) {
      try {
        const uploaded = await this.cloudinary.uploadImage(
          checkInPicture,
          'acs',
        );
        imageUrl = uploaded['secure_url'];
      } catch (error) {
        throw new BadRequestException('Image upload failed');
      }
    }

    const startVisitDetails = await this.databaseService.visit.create({
      data: {
        orgId,
        fullName: normalizedFullName,
        email: normalizedEmail,
        visitorOrganization,
        reasonId,
        staffId,
        checkInPicture: imageUrl ?? null,
      },
      include: {
        staff: {
          include: {
            department: true,
          },
        },
        organization: true,
        reasonOfVisit: true,
      },
    });

    let qrCodeBuffer: Buffer | null = null;
    try {
      // Generate QR code as buffer
      qrCodeBuffer = await QRCode.toBuffer(startVisitDetails.id);
    } catch (err) {
      console.error('Failed to generate QR code', err);
      qrCodeBuffer = null;
    }
    const emailDetails = {
      ...startVisitDetails,
      qrCodeBuffer,
    };

    try {
      await this.mailService.VisitStartToVisitor(emailDetails);
      await this.mailService.VisitStartToHost(emailDetails);
    } catch (error) {
      console.error('mail error:', error);
    }

    return {
      success: true,
      message: `${fullName} has checked in at ${startVisitDetails.startTime}`,
      startVisitDetails: {
        id: startVisitDetails.id,
        visitorId: startVisitDetails.id,
        fullName,
        email: normalizedEmail,
        visitorOrganization,
        hostDetails: {
          name: startVisitDetails.staff.name,
          department: startVisitDetails.staff.departmentId,
          designation: startVisitDetails.staff.designation,
        },
        reasonOfVisit: {
          name: startVisitDetails.reasonOfVisit?.name,
        },
        checkInTime: startVisitDetails.startTime,
      },
    };
  }

  async endVisit(
    orgId: string,
    endVisitDto: EndVisitDto,
    systemId?: string,
    role?: string,
  ) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'System'];
    let imageUrl: string | null = null;
    const { fullName, email } = endVisitDto;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFullName = fullName.trim();

    if (systemId) {
      const systemCredentialsExists =
        await this.databaseService.systemCredential.findUnique({
          where: {
            id: systemId,
          },
          include: {
            organization: true,
          },
        });

      if (!systemCredentialsExists) {
        throw new BadRequestException('Invalid user id.');
      }

      if (systemCredentialsExists.organization.id !== orgId) {
        throw new BadRequestException('Invalid credentials.');
      }
    }

    const visitExists = await this.databaseService.visit.findFirst({
      where: {
        fullName: normalizedFullName,
        orgId,
        email: normalizedEmail,
        status: 'ONGOING',
      },
    });

    if (!visitExists) {
      throw new BadRequestException('No such visit is on-going.');
    }

    //Only allow update if role is permitted
    if (role && !allowedRoles.includes(role)) {
      console.log('role not permitted');
      throw new BadRequestException('You are not allowed to end this visit.');
    }

    const updatedVisitStatus = await this.databaseService.visit.update({
      where: { id: visitExists.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      },
      include: {
        staff: {
          include: {
            department: true,
          },
        },
        organization: true,
        reasonOfVisit: true,
      },
    });
    await this.mailService.VisitEndToVisitor(updatedVisitStatus);
    await this.mailService.VisitEndToHost(updatedVisitStatus);
    return {
      success: true,
      message: `${normalizedFullName} has checked-out at ${new Date().toLocaleString()}.`,
      updatedVisitStatus: updatedVisitStatus,
    };
  }

  async endVisitQr(
    orgId: string,
    role: string,
    visitId: string,
    checkOutPicture?: Express.Multer.File,
  ) {
    let imageUrl: string | null = null;
    if (!orgId) {
      throw new BadRequestException('Provide valid orgId.');
    }

    if (!visitId) {
      throw new BadRequestException('Please scan a valid checkout QR code.');
    }
    const allowedRoles = ['System'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Unauthorized checkout attempt. Invalid role.',
      );
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExists) {
      throw new NotFoundException('Organization does not exists.');
    }

    const visitExists = await this.databaseService.visit.findUnique({
      where: {
        id: visitId,
      },
      include: {
        organization: true,
      },
    });

    if (!visitExists || visitExists.status === 'COMPLETED') {
      throw new BadRequestException('Please scan a valid checkout QR code.');
    }

    if (visitExists.orgId !== orgId) {
      throw new UnauthorizedException('Unauthorized checkout attempt.');
    }

    if (checkOutPicture) {
      try {
        const uploaded = await this.cloudinary.uploadImage(
          checkOutPicture,
          'acs',
        );
        imageUrl = uploaded['secure_url'];
      } catch (error) {
        throw new BadRequestException('Image upload failed');
      }
    }

    const updatedVisitStatus = await this.databaseService.visit.update({
      where: { id: visitExists.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      },
      include: {
        staff: {
          include: {
            department: true,
          },
        },
        organization: true,
        reasonOfVisit: true,
      },
    });

    await this.mailService.VisitEndToVisitor(updatedVisitStatus);
    await this.mailService.VisitEndToHost(updatedVisitStatus);

    return {
      success: true,
      msg: 'Visit completed successfully.',
    };
  }

  async getOnGoingVisitDetails(orgId: string, role: string, visitId: string) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root', 'System'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only admins, superadmin and root user have permission to access on-going visits.',
      );
    }

    const visitExists = await this.databaseService.visit.findUnique({
      where: { id: visitId, status: 'ONGOING' },
      include: {
        staff: {
          include: {
            department: true,
          },
        },
        reasonOfVisit: true,
      },
    });

    if (!visitExists) {
      throw new NotFoundException('No such visit found.');
    }

    if (visitExists.orgId !== orgId) {
      throw new UnauthorizedException('Unauthorized attempt.');
    }

    return {
      success: 'true',
      visitDetails: visitExists,
    };
  }

  async allOnGoingVisits(orgId: string, role: string) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root', 'System'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only admins, superadmin and root user have permission to access on-going visits.',
      );
    }

    const allOnGoingVisits = await this.databaseService.visit.findMany({
      where: {
        orgId,
        status: 'ONGOING',
      },
      include: {
        staff: {
          include: {
            department: true,
          },
        },
        reasonOfVisit: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (allOnGoingVisits.length === 0) {
      return {
        success: false,
        Message: 'There are no current on-going visits.',
      };
    }

    return {
      success: true,
      allOnGoingVisits: allOnGoingVisits,
    };
  }

  async allCompletedVisits(orgId: string, role: string) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only admins, superadmin and root user have permission to access completed visits.',
      );
    }

    const allCompletedVisits = await this.databaseService.visit.findMany({
      where: {
        orgId,
        status: 'COMPLETED',
      },
      include: {
        staff: {
          include: {
            department: true,
          },
        },
        reasonOfVisit: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (allCompletedVisits.length === 0) {
      return {
        success: false,
        Message: 'There are no current completed visits.',
      };
    }

    return {
      success: true,
      allCompletedVisits: allCompletedVisits,
    };
  }

  async getVisitorsPerDepartment(orgId: string) {
    const orgExists = await this.databaseService.organization.findUnique({
      where: {
        id: orgId,
      },
    });

    if (!orgExists) {
      throw new NotFoundException("Organization doesn't exists.");
    }

    const allVisits = await this.databaseService.visit.findMany({
      include: {
        staff: {
          include: {
            department: true,
          },
        },
      },
    });

    const completedVisits = await this.databaseService.visit.findMany({
      where: {
        status: 'COMPLETED',
      },
      include: {
        staff: {
          include: {
            department: true,
          },
        },
      },
    });

    const ongoingVisits = await this.databaseService.visit.findMany({
      where: {
        status: 'ONGOING',
      },
      include: {
        staff: {
          include: {
            department: true,
          },
        },
      },
    });

    // helper function to reduce visits into counts
    const aggregateByDept = (visits: typeof allVisits) => {
      return visits.reduce(
        (acc, visit) => {
          const deptName = visit.staff?.department?.name || 'No Department';
          acc[deptName] = (acc[deptName] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
    };

    return {
      all: aggregateByDept(allVisits),
      completed: aggregateByDept(completedVisits),
      ongoing: aggregateByDept(ongoingVisits),
    };
  }

  async exportCompletedVisits(
    orgId: string,
    role: string,
    filter: 'last_day' | 'last_month' | 'last_year' | 'custom',
    startDate?: string,
    endDate?: string,
  ) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Not allowed to export visit data.');
    }

    // TIME FILTER LOGIC //
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined = now;

    if (filter === 'last_day') {
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    if (filter === 'last_month') {
      from = new Date(now);
      from.setMonth(now.getMonth() - 1);
    }

    if (filter === 'last_year') {
      from = new Date(now);
      from.setFullYear(now.getFullYear() - 1);
    }

    if (filter === 'custom') {
      if (!startDate || !endDate) {
        throw new BadRequestException(
          'Custom filter requires startDate and endDate.',
        );
      }
      from = new Date(startDate);
      to = new Date(endDate);
    }

    // FETCH DATA //
    const visits = await this.databaseService.visit.findMany({
      where: {
        orgId,
        status: 'COMPLETED',
        endTime: {
          gte: from,
          lte: to,
        },
      },
      include: {
        staff: {
          include: { department: true },
        },
        reasonOfVisit: true,
      },
      orderBy: { endTime: 'desc' },
    });

    if (visits.length === 0) {
      throw new BadRequestException(
        'No completed visits found for the selected period.',
      );
    }

    // CREATE EXCEL //
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Completed Visits');

    // Columns
    sheet.columns = [
      { header: 'Visitor Name', key: 'fullName', width: 25 },
      { header: 'Visitor Organization', key: 'visitorOrganization', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Reason', key: 'reason', width: 25 },
      { header: 'Staff', key: 'staff', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Start Time', key: 'startTime', width: 20 },
      { header: 'End Time', key: 'endTime', width: 20 },
    ];

    // Rows
    visits.forEach((v) => {
      sheet.addRow({
        fullName: v.fullName,
        visitorOrganization: v.visitorOrganization,
        email: v.email,
        reason: v.reasonOfVisit?.name ?? '—',
        staff: v.staff.name,
        department: v.staff.department?.name ?? '—',
        startTime: v.startTime.toISOString(),
        endTime: v.endTime?.toISOString() ?? '',
      });
    });

    // RETURN AS BUFFER //
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}
