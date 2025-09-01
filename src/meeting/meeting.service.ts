import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateMeetingDto } from 'src/dto/create-meeting.dto';
import { EndMeetingDto } from 'src/dto/end-meeting.dto';

@Injectable()
export class MeetingService {
  constructor(private readonly databaseService: DatabaseService) {}
  async creatMeeting(
    orgId: string,
    role: string,
    createMeetingDto: CreateMeetingDto,
  ) {
    const {
      visitorFirstName,
      visitorLastName,
      visitorOrg,
      visitorEmail,
      reasonOfVisit,
      hostId,
    } = createMeetingDto;

    if (role !== 'Admin') {
      throw new UnauthorizedException(
        "This role doesn't have permission to access this end-point.",
      );
    }
    try {
      const orgExists = await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

      if (!orgExists) {
        throw new BadRequestException('Invalid Org ID.');
      }

      const employeeExists = await this.databaseService.employee.findUnique({
        where: {
          id: hostId,
        },
      });

      if (!employeeExists) {
        throw new BadRequestException('Invalid Employee ID.');
      }

      const meeting = await this.databaseService.meeting.create({
        data: {
          visitorFirstName,
          visitorLastName,
          visitorEmail,
          visitorOrg,
          reasonOfVisit,
          orgId,
          hostId,
        },
      });
      const now = new Date().toLocaleString();
      return {
        Success: true,
        Message: `${visitorFirstName} has checked in at ${now}.`,
        MeetingDetails: meeting,
        HostDetails: {
          Name: employeeExists.employeeName,
          Email: employeeExists.employeeEmail,
        },
      };
    } catch (error) {
      return {
        Success: false,
        Message: `Some error occured while creating the meeting.`,
        Error: error,
      };
    }
  }

  async endMeeting(role: string, endmeetingDto: EndMeetingDto) {
    const { visitorFirstName, visitorLastName } = endmeetingDto;
    if (role !== 'Admin') {
      throw new UnauthorizedException(
        "This role doesn't have permission to access this end-point.",
      );
    }

    try {
      const meetingExists = await this.databaseService.meeting.findMany({
        where: {
          visitorFirstName,
          visitorLastName,
          status: 'ONGOING',
        },
      });

      if (!meetingExists.length) {
        throw new NotFoundException('No such meeting exists!');
      }

      const updatedMeetingDetails =
        await this.databaseService.meeting.updateMany({
          where: {
            visitorFirstName,
            visitorLastName,
            status: { not: 'COMPLETED' },
          },
          data: {
            endTime: new Date(),
            status: 'COMPLETED',
          },
        });

      const updatedMeeting = await this.databaseService.meeting.findMany({
        where: {
          visitorFirstName,
          visitorLastName,
        },
      });

      return {
        Success: true,
        Message: `${visitorFirstName} has checked-out at ${new Date().toLocaleString()}.`,
        UpdatedMeetingDetails: updatedMeeting,
      };
    } catch (error) {
      return {
        Success: false,
        Message: `Some error occured while checking out the visitor.`,
        Error: error,
      };
    }
  }

  async onGoingMeetings(orgId: string, role: string) {
    if (role !== 'SuperAdmin') {
      throw new UnauthorizedException(
        "This role doesn't have permission to access this end-point.",
      );
    }
    const allOnGoingMeetings = await this.databaseService.meeting.findMany({
      where: {
        orgId,
        status: 'ONGOING',
      },
      include: {
        employee: true,
      },
    });

    if (!allOnGoingMeetings.length) {
      return {
        Success: false,
        Message: 'There are no current on-going meetings.',
      };
    }

    return {
      Success: true,
      AllOnGoingMeetings: allOnGoingMeetings,
    };
  }

  async completedMeetings(orgId: string, role: string) {
    if (role !== 'SuperAdmin') {
      throw new UnauthorizedException(
        "This role doesn't have permission to access this end-point.",
      );
    }
    const allCompletedMeetings = await this.databaseService.meeting.findMany({
      where: {
        orgId,
        status: 'COMPLETED',
      },
      include: {
        employee: true,
      },
    });
    if (!allCompletedMeetings.length) {
      return {
        Success: false,
        Message: 'There are no completed meetings',
      };
    }
    return {
      Success: true,
      AllCompletedMeetings: allCompletedMeetings,
    };
  }
}
