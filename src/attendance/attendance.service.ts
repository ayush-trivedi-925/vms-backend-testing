import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

import {
  AttendanceEventType,
  AttendanceSessionStatus,
  AttendanceClosureType,
} from '@prisma/client';

import { ScanAttendanceDto, AttendanceActionDto } from '../dto/attendance.dto';
import { DateTime } from 'luxon';

import { Response } from 'express';
// import * as ExcelJS from 'exceljs';
import * as ExcelJS from 'exceljs';

type AttendanceState =
  | 'NO_SESSION_TODAY'
  | 'WORKING'
  | 'ON_BREAK'
  | 'PREVIOUS_SESSION_OPEN'
  | 'DAY_COMPLETED';

@Injectable()
export class AttendanceService {
  constructor(private readonly databaseService: DatabaseService) {}

  private startOfOrgDay(date: Date, timezone: string): Date {
    return DateTime.fromJSDate(date, { zone: 'utc' }) // DB values are UTC
      .setZone(timezone) // move to org zone
      .startOf('day') // midnight in org
      .toUTC() // convert back to UTC for DB compare
      .toJSDate();
  }

  private floorToSecond(date: Date) {
    return new Date(Math.floor(date.getTime() / 1000) * 1000);
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
    const staff = await this.databaseService.staff.findUnique({
      where: { id: staffId },
      include: { organization: true },
    });

    if (!staff?.organization?.timezone) {
      throw new BadRequestException('Organization timezone not configured');
    }

    const tz = staff.organization.timezone;
    const todayDate = this.startOfOrgDay(now, tz);

    const openOldSession =
      await this.databaseService.attendanceSession.findFirst({
        where: {
          staffId,
          status: AttendanceSessionStatus.OPEN,
          date: { lt: todayDate },
        },
        orderBy: { date: 'desc' },
      });

    if (openOldSession) {
      return {
        state: 'PREVIOUS_SESSION_OPEN' as AttendanceState,
        session: openOldSession,
        lastEvent: null,
      };
    }

    // check today's session FIRST
    const todaySession = await this.databaseService.attendanceSession.findFirst(
      {
        where: { staffId, date: todayDate },
        include: {
          events: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      },
    );

    // day finished
    if (todaySession?.status === AttendanceSessionStatus.CLOSED) {
      return {
        state: 'DAY_COMPLETED' as AttendanceState,
        session: null,
        lastEvent: null,
      };
    }

    // now check open session
    const openSession = todaySession;

    if (!openSession) {
      return {
        state: 'NO_SESSION_TODAY' as AttendanceState,
        session: null,
        lastEvent: null,
      };
    }

    const lastEvent = openSession.events[0];

    if (!lastEvent) {
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
    const sorted = [...events]
      .map((e) => ({ ...e, timestamp: this.floorToSecond(e.timestamp) }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

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

    if (state === 'DAY_COMPLETED') {
      return {
        staffId: staff.id,
        staffName: staff.name,
        state,
        allowedActions: [],
        message: 'You have already completed attendance for today.',
      };
    }

    if (!orgExists?.timezone) {
      throw new BadRequestException('Organization timezone not configured');
    }

    const tz = orgExists.timezone;

    const previousDate = DateTime.fromJSDate(session!.date, { zone: 'utc' })
      .setZone(tz)
      .toISODate();

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

    if (isNaN(time.getTime())) {
      throw new BadRequestException('Invalid time');
    }

    const org = await this.databaseService.organization.findUnique({
      where: {
        id: orgId,
      },
    });

    if (!org?.timezone) {
      throw new BadRequestException('Organization timezone not configured');
    }

    const tz = org?.timezone;
    const today = this.startOfOrgDay(time, tz);

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

    if (isNaN(time.getTime())) {
      throw new BadRequestException('Invalid time');
    }

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

    if (isNaN(time.getTime())) {
      throw new BadRequestException('Invalid time');
    }

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

    if (isNaN(time.getTime())) {
      throw new BadRequestException('Invalid time');
    }

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

    const org = await this.databaseService.organization.findUnique({
      where: {
        id: orgId,
      },
    });

    const approxOut = new Date(approxPunchOutTime);
    const punchIn = new Date(currentPunchInTime);

    if (approxOut >= punchIn) {
      throw new BadRequestException(
        'Late punch-out must be before new punch-in time.',
      );
    }

    if (isNaN(approxOut.getTime())) {
      throw new BadRequestException('Invalid approx punch-out time');
    }

    if (isNaN(punchIn.getTime())) {
      throw new BadRequestException('Invalid current punch-in time');
    }

    if (!org?.timezone) {
      throw new BadRequestException('Organization timezone not configured');
    }

    const today = this.startOfOrgDay(punchIn, org?.timezone);

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

      if (
        prevSession.firstPunchInAt &&
        approxOut <= prevSession.firstPunchInAt
      ) {
        throw new BadRequestException(
          'Punch-out must be after the original punch-in time.',
        );
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

  async exportAttendanceRangeExcel(
    orgId: string,
    role: string,
    startIso: string,
    endIso: string,
  ): Promise<Buffer> {
    const allowedRoles = ['SuperAdmin', 'Admin'];

    if (!allowedRoles.includes(role)) {
      throw new ForbiddenException('Access denied.');
    }
    const org = await this.databaseService.organization.findUnique({
      where: { id: orgId },
      include: { workingHours: true },
    });
    if (!org) throw new Error('Invalid org id');

    const tz = org.timezone || 'UTC';

    // ===== build date range =====
    const startDT = DateTime.fromISO(startIso, { zone: tz }).startOf('day');
    const endDT = DateTime.fromISO(endIso, { zone: tz }).startOf('day');
    if (endDT < startDT)
      throw new BadRequestException('Ending data cannot be beofre start date.');

    const days: DateTime[] = [];
    let cur = startDT;
    while (cur <= endDT) {
      days.push(cur);
      cur = cur.plus({ days: 1 });
    }

    // ===== staff =====
    const staffList = await this.databaseService.staff.findMany({
      where: { orgId },
      include: { department: true, workingHours: true },
    });

    // ===== sessions =====
    const dateUTCs = days.map((d) => this.startOfOrgDay(d.toJSDate(), tz));

    const sessions = await this.databaseService.attendanceSession.findMany({
      where: { orgId, date: { in: dateUTCs } },
      include: { events: { orderBy: { timestamp: 'asc' } } },
    });

    const sessionsByKey = new Map<string, any>();
    for (const s of sessions) {
      const key = `${s.staffId}:${DateTime.fromJSDate(s.date, {
        zone: 'utc',
      }).toISODate()}`;
      sessionsByKey.set(key, s);
    }

    // ===== helper =====
    const getScheduleFor = (staff: any, dt: DateTime) => {
      const wh =
        staff.workingHours && staff.workingHours.length
          ? staff.workingHours
          : org.workingHours || [];

      const day = dt.toFormat('cccc').toUpperCase();
      return wh.find((r: any) => r.dayOfWeek === day) || null;
    };

    const recalcTotalsLocal = (
      events: { eventType: any; timestamp: Date }[],
    ) => {
      let totalWorkSeconds = 0;
      let totalBreakSeconds = 0;
      let currentWorkStart: Date | null = null;
      let currentBreakStart: Date | null = null;

      const sorted = events
        .map((e) => ({
          ...e,
          timestamp: new Date(Math.floor(e.timestamp.getTime() / 1000) * 1000),
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      for (const e of sorted) {
        switch (e.eventType) {
          case 'PUNCH_IN':
          case 'BREAK_END':
            if (currentBreakStart) {
              totalBreakSeconds +=
                (e.timestamp.getTime() - currentBreakStart.getTime()) / 1000;
              currentBreakStart = null;
            }
            currentWorkStart = e.timestamp;
            break;

          case 'BREAK_START':
            if (currentWorkStart) {
              totalWorkSeconds +=
                (e.timestamp.getTime() - currentWorkStart.getTime()) / 1000;
              currentWorkStart = null;
            }
            currentBreakStart = e.timestamp;
            break;

          case 'PUNCH_OUT':
          case 'LATE_PUNCH_OUT':
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
    };

    // ===== workbook =====
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');

    // ===== LEGEND =====
    sheet.addRow([]);
    sheet.addRow(['Legend']);

    const legendItems = [
      { label: 'Absent', color: 'FFFF9999' },
      { label: 'Late Arrival', color: 'FFFFFF99' },
      { label: 'Left Early', color: 'FFFFCC99' },
      { label: 'Late Punch Out', color: 'FFD9B3FF' },
      { label: 'Present', color: 'FFCCFFCC' },
      { label: 'Off Day', color: 'FFE0E0E0' },
    ];

    legendItems.forEach((l) => {
      const row = sheet.addRow(['', l.label]);
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: l.color },
      };
    });

    sheet.addRow([]);
    sheet.addRow([]);

    // ===== columns =====
    const headers = [
      'Employee Name',
      'Employee ID',
      'Email',
      'Department',
      'Date',
      'Status',
      'Arrival',
      'Leaving',
      'Work Hours',
      'Break Hours',
      'Late Punch Out',
      'Reason',
      'Late Arrival',
      'Left Early',
    ];

    let rowIndex = sheet.rowCount + 1;

    // ===== DATE LOOP =====
    for (const dt of days) {
      // ===== date title =====
      const dateTitle = `${dt.toFormat('EEEE').toUpperCase()} – ${dt.toFormat(
        'dd/MM/yyyy',
      )}`;

      sheet.mergeCells(rowIndex, 1, rowIndex + 1, headers.length);
      const titleCell = sheet.getCell(rowIndex, 1);
      titleCell.value = dateTitle;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00FFFF' },
      };

      rowIndex += 2;

      // ===== header =====
      const headerRow = sheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'medium' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' },
        };
      });

      rowIndex++;

      // ===== staff =====
      for (const staff of staffList) {
        const keyIso = DateTime.fromJSDate(
          this.startOfOrgDay(dt.toJSDate(), tz),
          { zone: 'utc' },
        ).toISODate();

        const session = sessionsByKey.get(`${staff.id}:${keyIso}`);

        const schedule = getScheduleFor(staff, dt);
        const isOffDay = !!schedule && schedule.isClosed;

        let status = 'Absent';
        let arrivalStr = '';
        let departureStr = '';
        let workH = 0;
        let breakH = 0;
        let latePunchOut = 'No';
        let latePunchReason = '';
        let lateArrival = 'No';
        let leftEarly = 'No';

        if (session) {
          status = 'Present';
          const events = session.events || [];

          const firstIn = events.find(
            (e: any) =>
              e.eventType === 'PUNCH_IN' || e.eventType === 'BREAK_END',
          );
          const lastOut = [...events]
            .reverse()
            .find(
              (e: any) =>
                e.eventType === 'PUNCH_OUT' || e.eventType === 'LATE_PUNCH_OUT',
            );

          const firstTs = firstIn
            ? DateTime.fromJSDate(firstIn.timestamp).setZone(tz)
            : null;
          const lastTs = lastOut
            ? DateTime.fromJSDate(lastOut.timestamp).setZone(tz)
            : null;

          if (firstTs) arrivalStr = firstTs.toFormat('HH:mm:ss');
          if (lastTs) departureStr = lastTs.toFormat('HH:mm:ss');

          const { totalWorkSeconds, totalBreakSeconds } = recalcTotalsLocal(
            events.map((e: any) => ({
              eventType: e.eventType,
              timestamp: e.timestamp,
            })),
          );
          workH = totalWorkSeconds;
          breakH = totalBreakSeconds;

          if (
            events.some((e: any) => e.eventType === 'LATE_PUNCH_OUT') ||
            session.closureType === 'LATE'
          ) {
            latePunchOut = 'Yes';
            const lateEvent = events.find(
              (e: any) => e.eventType === 'LATE_PUNCH_OUT',
            );
            if (lateEvent) latePunchReason = lateEvent.correctionNote ?? '';
          }

          if (schedule && schedule.startsAt && firstTs) {
            const schedStart = DateTime.fromISO(
              `${dt.toISODate()}T${schedule.startsAt}`,
              { zone: tz },
            );
            if (firstTs > schedStart) lateArrival = 'Yes';
          }

          if (schedule && schedule.endsAt && lastTs) {
            const schedEnd = DateTime.fromISO(
              `${dt.toISODate()}T${schedule.endsAt}`,
              { zone: tz },
            );
            if (lastTs < schedEnd) leftEarly = 'Yes';
          }
        } else if (isOffDay) {
          status = 'Off Day';
        }

        const workHStr = workH
          ? `${Math.floor(workH / 3600)}:${String(
              Math.floor((workH % 3600) / 60),
            ).padStart(2, '0')}`
          : '';

        const breakHStr = breakH
          ? `${Math.floor(breakH / 3600)}:${String(
              Math.floor((breakH % 3600) / 60),
            ).padStart(2, '0')}`
          : '';

        const row = sheet.addRow([
          staff.name,
          staff.employeeCode ?? '',
          staff.email ?? '',
          staff.department?.name ?? '',
          dt.toFormat('dd/MM/yyyy'),
          status,
          arrivalStr,
          departureStr,
          workHStr,
          breakHStr,
          latePunchOut,
          latePunchReason,
          lateArrival,
          leftEarly,
        ]);

        // ===== color =====
        let color = '';
        if (status === 'Absent') color = 'FFFFCCCC';
        else if (status === 'Off Day') color = 'FFEFEFEF';
        else if (latePunchOut === 'Yes') color = 'FFE0CCFF';
        else if (lateArrival === 'Yes') color = 'FFFFFF99';
        else if (leftEarly === 'Yes') color = 'FFFFCC99';
        else color = 'FFCCFFCC';

        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color },
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });

        rowIndex++;
      }
    }

    // ===== column width =====
    sheet.columns.forEach((col) => {
      col.width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
