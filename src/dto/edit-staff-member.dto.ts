import { IsEmail, IsOptional, IsString, IsEnum } from 'class-validator';

export class EditStaffMemberDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(['SuperAdmin', 'Admin', 'Staff'])
  role?: 'SuperAdmin' | 'Admin' | 'Staff';

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;
}
