import { IsString } from 'class-validator';

export class RemoveReportingDto {
  @IsString()
  staffId: string;

  @IsString()
  managerId: string;
}
