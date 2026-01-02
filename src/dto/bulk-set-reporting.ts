// dto/bulk-set-reporting.dto.ts
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class BulkSetReportingDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  staffIds: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  managerIds: string[];
}
