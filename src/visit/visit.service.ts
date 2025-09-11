import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { EndVisitDto } from 'src/dto/end-visit.dto';
import { StartVisitDto } from 'src/dto/start-visit.dto';
import { MailService } from 'src/service/mail/mail.service';

@Injectable()
export class VisitService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
  ) {}
  async startVisit(
    orgId: string,
    systemId: string,
    startVisitDto: StartVisitDto,
  ) {
    const { fullName, email, visitorOrganization, reasonOfVisit, staffId } =
      startVisitDto;
    const normalizedEmail = email.toLowerCase().trim();
    fullName.trim();
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

    const startVisitDetails = await this.databaseService.visit.create({
      data: {
        orgId,
        fullName,
        email: normalizedEmail,
        visitorOrganization,
        reasonOfVisit,
        staffId,
      },
      include: {
        staff: true,
        organization: true,
      },
    });

    console.log(startVisitDetails);

    await this.mailService.VisitStartToVisitor(startVisitDetails);
    await this.mailService.VisitStartToHost(startVisitDetails);

    return {
      success: true,
      message: `${fullName} has checked in at ${startVisitDetails.startTime}`,
      startVisitDetails: {
        visitorId: startVisitDetails.id,
        fullName,
        email,
        visitorOrganization,
        reasonOfVisit,
        hostDetails: {
          name: startVisitDetails.staff.name,
          department: startVisitDetails.staff.department,
          designation: startVisitDetails.staff.designation,
        },
        checkInTime: startVisitDetails.startTime,
      },
    };
  }

  async endVisit(orgId: string, systemId: string, endVisitDto: EndVisitDto) {
    const { fullName, email } = endVisitDto;
    const normalizedEmail = email.toLowerCase().trim();

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

    const visitExists = await this.databaseService.visit.findFirst({
      where: {
        fullName,
        orgId,
        email: normalizedEmail,
        status: 'ONGOING',
      },
    });

    if (!visitExists) {
      throw new BadRequestException('No such visit is on-going.');
    }

    const updatedVisitStatus = await this.databaseService.visit.update({
      where: { id: visitExists.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      },
      include: {
        staff: true,
        organization: true,
      },
    });

    await this.mailService.VisitEndToVisitor(updatedVisitStatus);
    await this.mailService.VisitEndToHost(updatedVisitStatus);
    return {
      success: true,
      message: `${fullName} has checked-out at ${new Date().toLocaleString()}.`,
      updatedVisitStatus: updatedVisitStatus,
    };
  }

  async allOnGoingVisits(orgId: string, role: string) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root'];
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
        staff: true,
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
        staff: true,
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
}
