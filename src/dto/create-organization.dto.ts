import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @IsString()
  @IsOptional()
  gst: string;

  @IsString()
  @Length(4, 4, { message: 'settingCode must be exactly 4 digits' })
  @Matches(/^[0-9]+$/, { message: 'settingCode must contain only numbers' })
  settingCode: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  accountLimit: number;

  @IsString()
  planId: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}
