import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import { WorkingHoursDto } from './working-hours.dto';
import { IsValidTimezone } from '../common/validators/is-valid-timezone.validator';

export class EditOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @Validate(IsValidTimezone)
  timezone: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  gst?: string;

  @IsString()
  @Length(4, 4, { message: 'settingCode must be exactly 4 digits' })
  @Matches(/^[0-9]+$/, { message: 'settingCode must contain only numbers' })
  settingCode: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  accountLimit?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;
}
