import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateEmployeeDetailsDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  employeeName: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  employeeEmail: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  designation: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  department: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  roleToAssign: string;
}
