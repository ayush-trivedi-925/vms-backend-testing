// ../dto/working-hours.dto.ts
import { Weekday } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  ArrayNotEmpty,
} from 'class-validator';

export class WorkingHoursDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startsAt must be in HH:mm format',
  })
  startsAt: string; // "09:00"

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endsAt must be in HH:mm format',
  })
  endsAt: string; // "18:00"

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Weekday, { each: true })
  days: Weekday[];
}
