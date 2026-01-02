import { IsString, IsArray } from 'class-validator';

export class SetReportingDto {
  @IsString()
  staffId: string;

  @IsArray()
  @IsString({ each: true })
  managerIds: string[];
}
