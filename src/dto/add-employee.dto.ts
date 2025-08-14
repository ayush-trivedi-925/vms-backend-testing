import { IsEmpty, IsString } from 'class-validator';

export class AddEmployeeDto {
  @IsString()
  @IsEmpty()
  employeeName: string;

  @IsString()
  @IsEmpty()
  employeeEmail: string;

  @IsString()
  @IsEmpty()
  designation: string;

  @IsString()
  @IsEmpty()
  department: string;
}
