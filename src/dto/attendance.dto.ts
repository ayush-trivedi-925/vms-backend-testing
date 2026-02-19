// ../attendance/dto/attendance.dto.ts
import {
  IsString,
  IsISO8601,
  IsOptional,
  IsIn,
  IsEmail,
} from 'class-validator';

export class ScanAttendanceDto {
  @IsString()
  @IsOptional()
  employeeCode: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  email: string;

  @IsISO8601()
  scanTime: string; // ISO string
}

export class AttendanceActionDto {
  @IsString()
  employeeCode: string;

  @IsIn([
    'PUNCH_IN',
    'BREAK_START',
    'BREAK_END',
    'PUNCH_OUT',
    'LATE_PUNCH_OUT_AND_PUNCH_IN',
  ])
  action:
    | 'PUNCH_IN'
    | 'BREAK_START'
    | 'BREAK_END'
    | 'PUNCH_OUT'
    | 'LATE_PUNCH_OUT_AND_PUNCH_IN';

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsISO8601()
  time?: string; // for simple actions

  // For late punch flow:
  @IsOptional()
  @IsString()
  previousSessionId?: string;

  @IsOptional()
  @IsISO8601()
  approxPunchOutTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsISO8601()
  currentPunchInTime?: string;
}
