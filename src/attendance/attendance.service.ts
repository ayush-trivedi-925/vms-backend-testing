import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

import {
  AttendanceEventType,
  AttendanceSessionStatus,
  AttendanceClosureType,
} from '@prisma/client';

import { ScanAttendanceDto, AttendanceActionDto } from '../dto/attendance.dto';

type AttendanceState =
  | 'NO_SESSION_TODAY'
  | 'WORKING'
  | 'ON_BREAK'
  | 'PREVIOUS_SESSION_OPEN';

@Injectable()
export class AttendanceService {
  constructor(private readonly databaseService: DatabaseService) {}

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private async getStaffByEmployeeCode(
    orgId: string,
    employeeCode?: string,
    email?: string,
  ) {
    const orgExists = await this.databaseService.organization.findUnique({
      where: {
        id: orgId,
      },
    });

    if (!orgExists) {
      throw new NotFoundException('Invalid org id.');
    }

    let staff;

    if (employeeCode) {
      staff = await this.databaseService.staff.findUnique({
        where: { employeeCode },
      });
    } else if (email) {
      staff = await this.databaseService.staff.findUnique({
        where: { email },
      });
    }

    if (!staff) {
      throw new NotFoundException('No employee found for these credentials.');
    }

    if (!staff.badgeActive) {
      throw new BadRequestException('This badge is deactivated.');
    }

    if (orgExists.id !== staff.orgId) {
      throw new BadRequestException(
        'Employee belongs to different organization.',
      );
    }

    return staff;
  }

  private async getStateForScan(staffId: string, now: Date) {
    const openSession = await this.databaseService.attendanceSession.findFirst({
      where: { staffId, status: AttendanceSessionStatus.OPEN },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!openSession) {
      return {
        state: 'NO_SESSION_TODAY' as AttendanceState,
        session: null,
        lastEvent: null,
      };
    }

    const sessionDate = this.startOfDay(openSession.date);
    const todayDate = this.startOfDay(now);

    if (sessionDate < todayDate) {
      return {
        state: 'PREVIOUS_SESSION_OPEN' as AttendanceState,
        session: openSession,
        lastEvent: openSession.events[0] || null,
      };
    }

    const lastEvent = openSession.events[0];

    if (!lastEvent) {
      // session with no events – treat like NO_SESSION_TODAY
      return {
        state: 'NO_SESSION_TODAY' as AttendanceState,
        session: null,
        lastEvent: null,
      };
    }

    if (lastEvent.eventType === AttendanceEventType.BREAK_START) {
      return {
        state: 'ON_BREAK' as AttendanceState,
        session: openSession,
        lastEvent,
      };
    }

    if (
      lastEvent.eventType === AttendanceEventType.PUNCH_IN ||
      lastEvent.eventType === AttendanceEventType.BREAK_END
    ) {
      return {
        state: 'WORKING' as AttendanceState,
        session: openSession,
        lastEvent,
      };
    }

    // Last event is punch_out or late punch – treat as closed logically
    return {
      state: 'NO_SESSION_TODAY' as AttendanceState,
      session: null,
      lastEvent: null,
    };
  }

  private recalcTotals(
    events: { eventType: AttendanceEventType; timestamp: Date }[],
  ) {
    if (!events.length) {
      return { totalWorkSeconds: 0, totalBreakSeconds: 0 };
    }

    const sorted = [...events].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    let totalWorkSeconds = 0;
    let totalBreakSeconds = 0;

    let currentWorkStart: Date | null = null;
    let currentBreakStart: Date | null = null;

    for (const e of sorted) {
      switch (e.eventType) {
        case AttendanceEventType.PUNCH_IN:
        case AttendanceEventType.BREAK_END:
          if (currentBreakStart) {
            totalBreakSeconds +=
              (e.timestamp.getTime() - currentBreakStart.getTime()) / 1000;
          }
          currentBreakStart = null;
          currentWorkStart = e.timestamp;
          break;

        case AttendanceEventType.BREAK_START:
          // finish work segment till break start
          if (currentWorkStart) {
            totalWorkSeconds +=
              (e.timestamp.getTime() - currentWorkStart.getTime()) / 1000;
            currentWorkStart = null;
          }
          currentBreakStart = e.timestamp;
          break;

        case AttendanceEventType.PUNCH_OUT:
        case AttendanceEventType.LATE_PUNCH_OUT:
          // finish work or break and end day
          if (currentBreakStart) {
            totalBreakSeconds +=
              (e.timestamp.getTime() - currentBreakStart.getTime()) / 1000;
            currentBreakStart = null;
          } else if (currentWorkStart) {
            totalWorkSeconds +=
              (e.timestamp.getTime() - currentWorkStart.getTime()) / 1000;
            currentWorkStart = null;
          }
          break;
      }
    }

    return { totalWorkSeconds, totalBreakSeconds };
  }

  // ========== SCAN ==========

  async scan(orgId, systemId, role, dto: ScanAttendanceDto) {
    const allowedRoles = ['System'];
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException(
        'Invalid role, only System can do this action.',
      );
    }

    const orgExists = await this.databaseService.organization.findUnique({
      where: {
        id: orgId,
      },
    });

    if (!orgExists) {
      throw new NotFoundException('Invalid organization id.');
    }

    const systemExists = await this.databaseService.systemCredential.findUnique(
      {
        where: {
          id: systemId,
        },
      },
    );

    if (!systemExists || systemExists.orgId !== orgId) {
      throw new BadRequestException(
        'Invalid credentials, system account belongs to different organization.',
      );
    }

    const { employeeCode, scanTime, email } = dto;
    const staff = await this.getStaffByEmployeeCode(orgId, employeeCode, email);
    const now = new Date(scanTime);

    const { state, session } = await this.getStateForScan(staff.id, now);

    if (state === 'NO_SESSION_TODAY') {
      return {
        staffId: staff.id,
        staffName: staff.name,
        state,
        allowedActions: ['PUNCH_IN'],
      };
    }

    if (state === 'WORKING') {
      return {
        staffId: staff.id,
        staffName: staff.name,
        state,
        sessionId: session!.id,
        allowedActions: ['BREAK_START', 'PUNCH_OUT'],
      };
    }

    if (state === 'ON_BREAK') {
      return {
        staffId: staff.id,
        staffName: staff.name,
        state,
        sessionId: session!.id,
        allowedActions: ['BREAK_END'],
      };
    }

    const date = this.startOfDay(session!.date);

    const previousDate = date.toISOString().split('T')[0];

    // PREVIOUS_SESSION_OPEN
    return {
      staffId: staff.id,
      staffName: staff.name,
      state: 'PREVIOUS_SESSION_OPEN' as AttendanceState,
      sessionId: session!.id,
      previousDate,
      allowedActions: ['LATE_PUNCH_OUT_AND_PUNCH_IN'],
      message:
        'You forgot to punch out on previous day. Please enter your approximate punch-out time and reason.',
    };
  }

  // ========== ACTIONS ==========

  async action(orgId, systemId, role, dto: AttendanceActionDto) {
    const allowedRoles = ['System'];
    if (!allowedRoles.includes(role)) {
      throw new BadRequestException(
        'Invalid role, only System can do this action.',
      );
    }

    const orgExists = await this.databaseService.organization.findUnique({
      where: {
        id: orgId,
      },
    });

    if (!orgExists) {
      throw new NotFoundException('Invalid organization id.');
    }

    const systemExists = await this.databaseService.systemCredential.findUnique(
      {
        where: {
          id: systemId,
        },
      },
    );

    if (!systemExists || systemExists.orgId !== orgId) {
      throw new BadRequestException(
        'Invalid credentials, system account belongs to different organization.',
      );
    }

    const { employeeCode, action } = dto;
    const staff = await this.getStaffByEmployeeCode(orgId, employeeCode);

    switch (action) {
      case 'PUNCH_IN':
        return this.handlePunchIn(staff.id, staff.orgId, dto);
      case 'BREAK_START':
        return this.handleBreakStart(staff.id, staff.orgId, dto);
      case 'BREAK_END':
        return this.handleBreakEnd(staff.id, staff.orgId, dto);
      case 'PUNCH_OUT':
        return this.handlePunchOut(staff.id, staff.orgId, dto);
      case 'LATE_PUNCH_OUT_AND_PUNCH_IN':
        return this.handleLatePunchOutAndPunchIn(staff.id, staff.orgId, dto);
      default:
        throw new BadRequestException('Invalid action');
    }
  }

  private async handlePunchIn(
    staffId: string,
    orgId: string,
    dto: AttendanceActionDto,
  ) {
    const time = dto.time ? new Date(dto.time) : new Date();
    const today = this.startOfDay(time);

    return this.databaseService.$transaction(async (tx) => {
      // make sure there is no open session from previous days
      const openOldSession = await tx.attendanceSession.findFirst({
        where: {
          staffId,
          status: AttendanceSessionStatus.OPEN,
          date: { lt: today },
        },
      });

      if (openOldSession) {
        throw new BadRequestException(
          'Previous day session is still open. Use late punch flow.',
        );
      }

      const openToday = await tx.attendanceSession.findFirst({
        where: {
          staffId,
          status: AttendanceSessionStatus.OPEN,
          date: today,
        },
      });

      if (openToday) {
        throw new BadRequestException('Already punched in today.');
      }

      const session = await tx.attendanceSession.create({
        data: {
          orgId,
          staffId,
          date: today,
          status: AttendanceSessionStatus.OPEN,
          firstPunchInAt: time,
        },
      });

      await tx.attendanceEvent.create({
        data: {
          orgId,
          staffId,
          sessionId: session.id,
          eventType: AttendanceEventType.PUNCH_IN,
          source: 'QR',
          timestamp: time,
        },
      });

      return {
        status: 'ok',
        result: 'PUNCH_IN',
        sessionId: session.id,
        time: time.toISOString(),
      };
    });
  }

  private async handleBreakStart(
    staffId: string,
    orgId: string,
    dto: AttendanceActionDto,
  ) {
    if (!dto.sessionId) {
      throw new BadRequestException('sessionId is required for BREAK_START');
    }
    const time = dto.time ? new Date(dto.time) : new Date();

    return this.databaseService.$transaction(async (tx) => {
      const session = await tx.attendanceSession.findUnique({
        where: { id: dto.sessionId },
        include: { events: { orderBy: { timestamp: 'desc' }, take: 1 } },
      });

      if (!session || session.staffId !== staffId) {
        throw new NotFoundException('Session not found.');
      }

      if (session.status !== AttendanceSessionStatus.OPEN) {
        throw new BadRequestException('Session is not open.');
      }

      const last = session.events[0];

      if (
        !last ||
        (last.eventType !== AttendanceEventType.PUNCH_IN &&
          last.eventType !== AttendanceEventType.BREAK_END)
      ) {
        throw new BadRequestException(
          'Cannot start break – invalid state (must be working).',
        );
      }

      await tx.attendanceEvent.create({
        data: {
          orgId,
          staffId,
          sessionId: session.id,
          eventType: AttendanceEventType.BREAK_START,
          source: 'QR',
          timestamp: time,
        },
      });

      return {
        status: 'ok',
        result: 'BREAK_START',
        time: time.toISOString(),
      };
    });
  }

  private async handleBreakEnd(
    staffId: string,
    orgId: string,
    dto: AttendanceActionDto,
  ) {
    if (!dto.sessionId) {
      throw new BadRequestException('sessionId is required for BREAK_END');
    }
    const time = dto.time ? new Date(dto.time) : new Date();

    return this.databaseService.$transaction(async (tx) => {
      const session = await tx.attendanceSession.findUnique({
        where: { id: dto.sessionId },
        include: { events: { orderBy: { timestamp: 'desc' }, take: 1 } },
      });

      if (!session || session.staffId !== staffId) {
        throw new NotFoundException('Session not found.');
      }

      if (session.status !== AttendanceSessionStatus.OPEN) {
        throw new BadRequestException('Session is not open.');
      }

      const last = session.events[0];

      if (!last || last.eventType !== AttendanceEventType.BREAK_START) {
        throw new BadRequestException(
          'Cannot end break – not currently on break.',
        );
      }

      await tx.attendanceEvent.create({
        data: {
          orgId,
          staffId,
          sessionId: session.id,
          eventType: AttendanceEventType.BREAK_END,
          source: 'QR',
          timestamp: time,
        },
      });

      return {
        status: 'ok',
        result: 'BREAK_END',
        time: time.toISOString(),
      };
    });
  }

  private async handlePunchOut(
    staffId: string,
    orgId: string,
    dto: AttendanceActionDto,
  ) {
    if (!dto.sessionId) {
      throw new BadRequestException('sessionId is required for PUNCH_OUT');
    }
    const time = dto.time ? new Date(dto.time) : new Date();

    return this.databaseService.$transaction(async (tx) => {
      const session = await tx.attendanceSession.findUnique({
        where: { id: dto.sessionId },
        include: {
          events: { orderBy: { timestamp: 'asc' } },
        },
      });

      if (!session || session.staffId !== staffId) {
        throw new NotFoundException('Session not found.');
      }

      if (session.status !== AttendanceSessionStatus.OPEN) {
        throw new BadRequestException('Session is not open.');
      }

      // create punch-out event
      const punchOutEvent = await tx.attendanceEvent.create({
        data: {
          orgId,
          staffId,
          sessionId: session.id,
          eventType: AttendanceEventType.PUNCH_OUT,
          source: 'QR',
          timestamp: time,
        },
      });

      const allEvents = [...session.events, punchOutEvent];

      const { totalWorkSeconds, totalBreakSeconds } =
        this.recalcTotals(allEvents);

      await tx.attendanceSession.update({
        where: { id: session.id },
        data: {
          status: AttendanceSessionStatus.CLOSED,
          closureType: AttendanceClosureType.NORMAL,
          lastPunchOutAt: time,
          totalWorkSeconds,
          totalBreakSeconds,
        },
      });

      return {
        status: 'ok',
        result: 'PUNCH_OUT',
        time: time.toISOString(),
      };
    });
  }

  private async handleLatePunchOutAndPunchIn(
    staffId: string,
    orgId: string,
    dto: AttendanceActionDto,
  ) {
    const {
      previousSessionId,
      approxPunchOutTime,
      reason,
      currentPunchInTime,
    } = dto;

    if (!previousSessionId || !approxPunchOutTime || !currentPunchInTime) {
      throw new BadRequestException(
        'previousSessionId, approxPunchOutTime and currentPunchInTime are required.',
      );
    }

    const approxOut = new Date(approxPunchOutTime);
    const punchIn = new Date(currentPunchInTime);
    const today = this.startOfDay(punchIn);

    return this.databaseService.$transaction(async (tx) => {
      const prevSession = await tx.attendanceSession.findUnique({
        where: { id: previousSessionId },
        include: { events: { orderBy: { timestamp: 'asc' } } },
      });

      if (!prevSession || prevSession.staffId !== staffId) {
        throw new NotFoundException('Previous session not found.');
      }

      if (prevSession.status !== AttendanceSessionStatus.OPEN) {
        throw new BadRequestException('Previous session is not open.');
      }

      // late punch-out event
      const lateEvent = await tx.attendanceEvent.create({
        data: {
          orgId,
          staffId,
          sessionId: prevSession.id,
          eventType: AttendanceEventType.LATE_PUNCH_OUT,
          source: 'QR',
          timestamp: approxOut,
          isCorrection: true,
          correctionNote: reason || null,
        },
      });

      const allEventsPrev = [...prevSession.events, lateEvent];
      const { totalWorkSeconds, totalBreakSeconds } =
        this.recalcTotals(allEventsPrev);

      await tx.attendanceSession.update({
        where: { id: prevSession.id },
        data: {
          status: AttendanceSessionStatus.CLOSED,
          closureType: AttendanceClosureType.LATE,
          isLateClosure: true,
          lastPunchOutAt: approxOut,
          totalWorkSeconds,
          totalBreakSeconds,
          latePunchOutReason: reason || null,
          latePunchOutRecordedAt: new Date(),
        },
      });

      // now create today's session & punch in
      const sessionToday = await tx.attendanceSession.create({
        data: {
          orgId,
          staffId,
          date: today,
          status: AttendanceSessionStatus.OPEN,
          firstPunchInAt: punchIn,
        },
      });

      await tx.attendanceEvent.create({
        data: {
          orgId,
          staffId,
          sessionId: sessionToday.id,
          eventType: AttendanceEventType.PUNCH_IN,
          source: 'QR',
          timestamp: punchIn,
        },
      });

      return {
        status: 'ok',
        result: 'LATE_PUNCH_OUT_AND_PUNCH_IN',
        closedSessionId: prevSession.id,
        newSessionId: sessionToday.id,
        latePunchOutTime: approxOut.toISOString(),
        newPunchInTime: punchIn.toISOString(),
      };
    });
  }
}
