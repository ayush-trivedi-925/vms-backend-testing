import { IsEmail, IsOptional, IsString, IsEnum } from 'class-validator';
import { AccountStatusEnum, MemberRoleEnum } from 'generated/prisma';

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
}
