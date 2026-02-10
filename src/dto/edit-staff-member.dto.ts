import {
  IsEmail,
  IsOptional,
  IsString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { AccountStatusEnum, MemberRoleEnum } from '@prisma/client';
import { Type } from 'class-transformer';
import { WorkingHoursDto } from './working-hours.dto';

export class EditStaffMemberDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(MemberRoleEnum)
  role?: MemberRoleEnum;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsEnum(AccountStatusEnum)
  accountStatus?: AccountStatusEnum;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;
}
