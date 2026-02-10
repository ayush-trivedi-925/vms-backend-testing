// dto/update-day-working-hours.dto.ts
import { IsEnum, IsNotEmpty, Matches } from 'class-validator';
import { Weekday } from '@prisma/client';

export class UpdateDayWorkingHoursDto {
  @IsEnum(Weekday)
  day: Weekday;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startsAt: string; // required

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endsAt: string; // required
}
